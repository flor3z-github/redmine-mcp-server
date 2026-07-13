import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRedmineServer } from '../../src/server.js';
import { tools, toolHandlers } from '../../src/tools/index.js';

// Mock axios for all tests
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

describe('Redmine MCP Server Integration', () => {
  let server: Server;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.REDMINE_URL = 'https://test.redmine.com';
    process.env.REDMINE_API_KEY = 'test-api-key';
  });

  beforeEach(async () => {
    server = await createRedmineServer();
  });

  afterAll(() => {
    // Clean up
    delete process.env.REDMINE_URL;
    delete process.env.REDMINE_API_KEY;
  });

  describe('Server Initialization', () => {
    it('should create server successfully', () => {
      expect(server).toBeInstanceOf(Server);
    });

    it('should be ready for connections', () => {
      expect(server).toBeDefined();
    });
  });

  describe('Tools Registration', () => {
    it('should have registered tools', () => {
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have tool handlers', () => {
      expect(toolHandlers).toBeDefined();
      expect(typeof toolHandlers).toBe('object');
    });

    it('should have expected tool names', () => {
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('redmine_list_issues');
      expect(toolNames).toContain('redmine_list_projects');
      expect(toolNames).toContain('redmine_get_current_user');
      expect(toolNames).toContain('redmine_create_issue');
      expect(toolNames).toContain('redmine_list_time_entries');
    });

    it('should have handlers for all tools', () => {
      for (const tool of tools) {
        expect(toolHandlers[tool.name]).toBeDefined();
        expect(typeof toolHandlers[tool.name]).toBe('function');
      }
    });
  });

  describe('Tool Handler Execution', () => {
    it('should handle list issues tool', async () => {
      const handler = toolHandlers['redmine_list_issues'];
      expect(handler).toBeDefined();

      // Mock successful response
      const mockAxios = await import('axios');
      const mockGet = vi.fn().mockResolvedValue({
        data: { issues: [], total_count: 0 }
      });
      (mockAxios.default.create as any).mockReturnValue({
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      });

      const result = await handler({ limit: 10 });
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle get current user tool', async () => {
      const handler = toolHandlers['redmine_get_current_user'];
      expect(handler).toBeDefined();

      // Mock successful response
      const mockAxios = await import('axios');
      const mockGet = vi.fn().mockResolvedValue({
        data: { user: { id: 1, firstname: 'Test', lastname: 'User' } }
      });
      (mockAxios.default.create as any).mockReturnValue({
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      });

      const result = await handler({});
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const handler = toolHandlers['redmine_get_issue'];
      expect(handler).toBeDefined();

      // Test with invalid input (missing required id)
      const result = await handler({});
      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should handle network errors gracefully', async () => {
      const handler = toolHandlers['redmine_list_issues'];
      expect(handler).toBeDefined();

      const result = await handler({ limit: 10 });
      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('Tool Schema Validation', () => {
    it('should have valid input schemas for all tools', () => {
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it('should have proper tool descriptions', () => {
      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it('should have proper tool names', () => {
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name).toMatch(/^redmine_/);
      }
    });
  });
});