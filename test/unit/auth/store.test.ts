import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('OAuth Store', () => {
  let tmpDir: string;
  let store: typeof import('../../../src/auth/store.js');

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-store-test-'));
    process.env.MCP_DATA_DIR = tmpDir;

    // Re-import to get fresh module state
    store = await import('../../../src/auth/store.js');
    store.loadStore();
  });

  afterAll(() => {
    delete process.env.MCP_DATA_DIR;
  });

  describe('Client registration', () => {
    it('should register and retrieve a client', () => {
      const client = store.registerClient({
        redirect_uris: ['http://localhost:3000/callback'],
        client_name: 'test-client',
      } as any);

      expect(client.client_id).toBeDefined();
      expect(client.client_id_issued_at).toBeDefined();
      expect(client.client_name).toBe('test-client');

      const retrieved = store.getClient(client.client_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.client_name).toBe('test-client');
    });

    it('should return undefined for non-existent client', () => {
      const result = store.getClient('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Auth codes', () => {
    it('should store and retrieve an auth code', () => {
      store.storeAuthCode('test-code', {
        clientId: 'client-1',
        redmineApiKey: 'api-key-123',
        codeChallenge: 'challenge-abc',
        redirectUri: 'http://localhost/callback',
        scopes: ['read'],
      });

      const record = store.getAuthCode('test-code');
      expect(record).toBeDefined();
      expect(record?.clientId).toBe('client-1');
      expect(record?.redmineApiKey).toBe('api-key-123');
      expect(record?.codeChallenge).toBe('challenge-abc');
    });

    it('should delete an auth code', () => {
      store.storeAuthCode('delete-me', {
        clientId: 'c1',
        redmineApiKey: 'key',
        codeChallenge: 'ch',
        redirectUri: 'http://localhost/cb',
        scopes: [],
      });

      store.deleteAuthCode('delete-me');
      expect(store.getAuthCode('delete-me')).toBeUndefined();
    });
  });

  describe('Access tokens', () => {
    it('should store and retrieve an access token', () => {
      store.storeAccessToken('token-abc', {
        clientId: 'client-1',
        redmineApiKey: 'api-key-123',
        scopes: ['read'],
      });

      const record = store.getAccessToken('token-abc');
      expect(record).toBeDefined();
      expect(record?.redmineApiKey).toBe('api-key-123');
    });

    it('should return API key for a token via convenience method', () => {
      store.storeAccessToken('token-conv', {
        clientId: 'c1',
        redmineApiKey: 'my-api-key',
        scopes: [],
      });

      expect(store.getApiKeyForToken('token-conv')).toBe('my-api-key');
      expect(store.getApiKeyForToken('nonexistent')).toBeUndefined();
    });
  });

  describe('Refresh tokens', () => {
    it('should store and retrieve a refresh token', () => {
      store.storeRefreshToken('refresh-1', {
        clientId: 'c1',
        redmineApiKey: 'key',
        scopes: ['read'],
      });

      const record = store.getRefreshToken('refresh-1');
      expect(record).toBeDefined();
      expect(record?.clientId).toBe('c1');
    });

    it('should delete a refresh token', () => {
      store.storeRefreshToken('refresh-del', {
        clientId: 'c1',
        redmineApiKey: 'key',
        scopes: [],
      });

      store.deleteRefreshToken('refresh-del');
      expect(store.getRefreshToken('refresh-del')).toBeUndefined();
    });
  });

  describe('Persistence', () => {
    it('should persist data to disk and reload', () => {
      store.storeAccessToken('persist-token', {
        clientId: 'c1',
        redmineApiKey: 'persist-key',
        scopes: [],
      });

      // Verify file exists
      const file = path.join(tmpDir, 'oauth-store.json');
      expect(fs.existsSync(file)).toBe(true);

      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      expect(data.accessTokens['persist-token']).toBeDefined();
      expect(data.accessTokens['persist-token'].redmineApiKey).toBe('persist-key');
    });
  });
});
