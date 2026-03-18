import { randomUUID } from 'node:crypto';
import https from 'node:https';
import fs from 'node:fs';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { createRedmineServer } from '../server.js';
import { sessionStore, SessionCredentials } from '../context.js';
import { RedmineOAuthProvider, loadStore } from '../auth/index.js';
import { config } from '../config.js';

export async function startHttpTransport(port: number, host: string): Promise<void> {
  // Load persisted OAuth data on startup
  loadStore();

  const provider = new RedmineOAuthProvider(config.redmine.url);

  // Determine issuerUrl
  const hasTls = !!(config.transport.tlsCert && config.transport.tlsKey);
  let issuerUrl: URL;

  if (config.transport.issuerUrl) {
    issuerUrl = new URL(config.transport.issuerUrl);
  } else if (hasTls) {
    issuerUrl = new URL(`https://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  } else {
    issuerUrl = new URL(`http://localhost:${port}`);
  }

  const app = express();

  // Trust proxy for correct protocol detection behind reverse proxies
  app.set('trust proxy', 1);

  // Parse URL-encoded form data (for auth callback)
  app.use(express.urlencoded({ extended: false }));

  // Parse JSON bodies
  app.use(express.json());

  // Mount OAuth endpoints (/.well-known/*, /authorize, /token, /register, /revoke)
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
      serviceDocumentationUrl: new URL(config.redmine.url),
    })
  );

  // Auth callback: form POST from the auth page
  app.post('/authorize/callback', async (req, res) => {
    try {
      await provider.handleAuthCallback(req, res);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] Auth callback error:`, error);
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });

  // Bearer auth middleware for MCP endpoints
  const bearerAuth = requireBearerAuth({ verifier: provider });

  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionCredentials = new Map<string, SessionCredentials>();

  // POST /mcp — JSON-RPC message handling
  app.post('/mcp', bearerAuth, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Extract Redmine API key from verified auth info
    const credentials: SessionCredentials = {
      redmineApiKey: (req.auth?.extra as Record<string, unknown> | undefined)?.redmineApiKey as string | undefined,
    };

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId) as StreamableHTTPServerTransport;

        await sessionStore.run(credentials, async () => {
          await transport.handleRequest(req, res, req.body);
        });
        return;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            console.error(`[${new Date().toISOString()}] [INFO] Session initialized: ${sid}`);
            transports.set(sid, transport);
            sessionCredentials.set(sid, credentials);
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) {
            transports.delete(sid);
            sessionCredentials.delete(sid);
            console.error(`[${new Date().toISOString()}] [INFO] Session closed: ${sid}`);
          }
        };

        const server = await createRedmineServer();
        await server.connect(transport);

        await sessionStore.run(credentials, async () => {
          await transport.handleRequest(req, res, req.body);
        });
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] MCP request error:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp — SSE stream
  app.get('/mcp', bearerAuth, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = transports.get(sessionId) as StreamableHTTPServerTransport;
    const credentials = sessionCredentials.get(sessionId) ?? {};
    await sessionStore.run(credentials, async () => {
      await transport.handleRequest(req, res);
    });
  });

  // DELETE /mcp — session termination
  app.delete('/mcp', bearerAuth, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = transports.get(sessionId) as StreamableHTTPServerTransport;
    await transport.handleRequest(req, res);
  });

  // GET /health — health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', sessions: transports.size });
  });

  // Start server (HTTPS if TLS configured, HTTP otherwise)
  return new Promise((resolve) => {
    let server: ReturnType<typeof https.createServer> | ReturnType<typeof app.listen>;

    if (hasTls) {
      const cert = fs.readFileSync(config.transport.tlsCert!);
      const key = fs.readFileSync(config.transport.tlsKey!);
      server = https.createServer({ cert, key }, app);
      server.listen(port, host, () => {
        console.error(`[${new Date().toISOString()}] [INFO] Streamable HTTP server listening on https://${host}:${port}`);
        resolve();
      });
    } else {
      server = app.listen(port, host, () => {
        console.error(`[${new Date().toISOString()}] [INFO] Streamable HTTP server listening on http://${host}:${port}`);
        resolve();
      });
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`[${new Date().toISOString()}] [INFO] Received ${signal}, shutting down...`);
      for (const [sid, transport] of transports) {
        try {
          await transport.close();
          transports.delete(sid);
          sessionCredentials.delete(sid);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [ERROR] Error closing session ${sid}:`, error);
        }
      }
      (server as ReturnType<typeof app.listen>).close(() => {
        console.error(`[${new Date().toISOString()}] [INFO] Server shutdown complete`);
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}
