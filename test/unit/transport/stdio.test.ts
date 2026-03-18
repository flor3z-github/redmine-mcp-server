import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const mockTransportInstance = {
  onclose: null as any,
  onerror: null as any,
  close: vi.fn(),
};

// Mock StdioServerTransport as a class
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: class {
      onclose = mockTransportInstance.onclose;
      onerror = mockTransportInstance.onerror;
      close = mockTransportInstance.close;
    },
  };
});

// Mock axios
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
    }))
  }
}));

describe('Stdio Transport', () => {
  let startStdioTransport: typeof import('../../../src/transport/stdio.js').startStdioTransport;

  beforeAll(async () => {
    process.env.REDMINE_URL = 'https://test.redmine.com';
    process.env.REDMINE_API_KEY = 'test-api-key';

    const mod = await import('../../../src/transport/stdio.js');
    startStdioTransport = mod.startStdioTransport;
  });

  afterAll(() => {
    delete process.env.REDMINE_URL;
    delete process.env.REDMINE_API_KEY;
  });

  it('should export startStdioTransport function', () => {
    expect(startStdioTransport).toBeDefined();
    expect(typeof startStdioTransport).toBe('function');
  });

  it('should connect server to transport', async () => {
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    const mockServer = {
      connect: mockConnect,
      onerror: null as any,
    } as unknown as Server;

    // Don't await - it sets up stdin listeners that won't resolve in test
    startStdioTransport(mockServer);

    // Give async operations time to run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockConnect).toHaveBeenCalled();
  });

  it('should set server.onerror handler', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      onerror: null as any,
    } as unknown as Server;

    startStdioTransport(mockServer);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockServer.onerror).toBeDefined();
    expect(typeof mockServer.onerror).toBe('function');
  });
});
