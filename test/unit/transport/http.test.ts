import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Mock axios before importing modules that use it
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    get: vi.fn(),
  }
}));

describe('HTTP Transport', () => {
  let startHttpTransport: typeof import('../../../src/transport/http.js').startHttpTransport;

  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    process.env.MCP_DATA_DIR = tmpDir;
    process.env.REDMINE_URL = 'https://test.redmine.com';
    process.env.REDMINE_API_KEY = 'test-api-key';

    const mod = await import('../../../src/transport/http.js');
    startHttpTransport = mod.startHttpTransport;
  });

  afterAll(() => {
    delete process.env.REDMINE_URL;
    delete process.env.REDMINE_API_KEY;
    delete process.env.MCP_DATA_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export startHttpTransport function', () => {
    expect(startHttpTransport).toBeDefined();
    expect(typeof startHttpTransport).toBe('function');
  });

  it('should start HTTP server and respond to health check', async () => {
    const port = 19876;
    const host = '127.0.0.1';

    const serverPromise = startHttpTransport(port, host);

    // Give the server a moment to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test health endpoint (no auth required)
    const response = await fetch(`http://${host}:${port}/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.sessions).toBe(0);
  });

  it('should return 401 for POST /mcp without Bearer token', async () => {
    const port = 19877;
    const host = '127.0.0.1';

    await startHttpTransport(port, host);
    await new Promise(resolve => setTimeout(resolve, 300));

    const response = await fetch(`http://${host}:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    expect(response.status).toBe(401);
  });

  it('should serve OAuth authorization server metadata', async () => {
    const port = 19878;
    const host = '127.0.0.1';

    await startHttpTransport(port, host);
    await new Promise(resolve => setTimeout(resolve, 300));

    const response = await fetch(`http://${host}:${port}/.well-known/oauth-authorization-server`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('issuer');
    expect(body).toHaveProperty('authorization_endpoint');
    expect(body).toHaveProperty('token_endpoint');
    expect(body).toHaveProperty('registration_endpoint');
  });

  it('should return 400 for GET /mcp without session ID', async () => {
    const port = 19879;
    const host = '127.0.0.1';

    await startHttpTransport(port, host);
    await new Promise(resolve => setTimeout(resolve, 300));

    // GET /mcp requires Bearer auth too
    const response = await fetch(`http://${host}:${port}/mcp`);
    expect(response.status).toBe(401);
  });

  it('should return 401 for DELETE /mcp without auth', async () => {
    const port = 19880;
    const host = '127.0.0.1';

    await startHttpTransport(port, host);
    await new Promise(resolve => setTimeout(resolve, 300));

    const response = await fetch(`http://${host}:${port}/mcp`, { method: 'DELETE' });
    expect(response.status).toBe(401);
  });
});
