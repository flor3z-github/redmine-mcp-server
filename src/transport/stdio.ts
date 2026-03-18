import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function startStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();

  transport.onclose = () => {
    console.error(`[${new Date().toISOString()}] [INFO] Transport closed gracefully`);
  };

  transport.onerror = (error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] Transport error:`, error);
  };

  server.onerror = (error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] Server error:`, error);
  };

  console.error(`[${new Date().toISOString()}] [INFO] Establishing MCP connection...`);
  await server.connect(transport);

  console.error(`[${new Date().toISOString()}] [INFO] Server is running and ready for requests`);

  // Keep process alive by maintaining event loop activity
  const keepAlive = globalThis.setInterval(() => {}, 1000000);

  // Keep the process alive and handle stdin properly for MCP
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  // Handle stdin closure (when client disconnects)
  process.stdin.on('end', () => {
    console.error(`[${new Date().toISOString()}] [INFO] Client disconnected (stdin closed)`);
    process.exit(0);
  });

  process.stdin.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] Stdin error:`, error);
    process.exit(1);
  });

  // Handle process termination gracefully
  const cleanup = (signal: string) => {
    console.error(`[${new Date().toISOString()}] [INFO] Received ${signal}, shutting down...`);
    globalThis.clearInterval(keepAlive);
    transport.close?.();
    process.exit(0);
  };

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  process.on('SIGQUIT', () => cleanup('SIGQUIT'));
}
