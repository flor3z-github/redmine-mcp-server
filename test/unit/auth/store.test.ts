import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
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
    vi.resetModules();
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

    it('should write the store file with owner-only permissions', () => {
      store.storeAccessToken('secure-token', {
        clientId: 'c1',
        redmineApiKey: 'secure-key',
        scopes: [],
      });

      const file = path.join(tmpDir, 'oauth-store.json');
      const mode = fs.statSync(file).mode & 0o777;

      expect(mode).toBe(0o600);
      expect(fs.readdirSync(tmpDir).filter(name => name.endsWith('.tmp'))).toEqual([]);
    });

    it('should load partial store files with empty defaults', () => {
      const file = path.join(tmpDir, 'oauth-store.json');
      fs.writeFileSync(file, JSON.stringify({
        accessTokens: {
          active: {
            clientId: 'c1',
            redmineApiKey: 'active-key',
            scopes: [],
            expiresAt: Date.now() + 60_000,
          },
        },
      }), 'utf-8');
      fs.chmodSync(file, 0o644);

      store.loadStore();

      expect(store.getAccessToken('active')?.redmineApiKey).toBe('active-key');
      expect(store.getClient('missing')).toBeUndefined();
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    });

    it('should fall back to an empty store when persisted JSON is invalid', () => {
      const file = path.join(tmpDir, 'oauth-store.json');
      fs.writeFileSync(file, 'not-json', 'utf-8');

      expect(() => store.loadStore()).not.toThrow();
      expect(store.getAccessToken('active')).toBeUndefined();
      expect(store.getRefreshToken('refresh')).toBeUndefined();
    });

    it('should prune expired auth codes and access tokens when loading', () => {
      const file = path.join(tmpDir, 'oauth-store.json');
      const past = Date.now() - 60_000;
      const future = Date.now() + 60_000;

      fs.writeFileSync(file, JSON.stringify({
        authCodes: {
          expired: {
            clientId: 'c1',
            redmineApiKey: 'expired-key',
            codeChallenge: 'challenge',
            redirectUri: 'http://localhost/callback',
            scopes: [],
            expiresAt: past,
          },
          active: {
            clientId: 'c1',
            redmineApiKey: 'active-key',
            codeChallenge: 'challenge',
            redirectUri: 'http://localhost/callback',
            scopes: [],
            expiresAt: future,
          },
        },
        accessTokens: {
          expired: {
            clientId: 'c1',
            redmineApiKey: 'expired-key',
            scopes: [],
            expiresAt: past,
          },
          active: {
            clientId: 'c1',
            redmineApiKey: 'active-key',
            scopes: [],
            expiresAt: future,
          },
        },
        refreshTokens: {
          refresh: {
            clientId: 'c1',
            redmineApiKey: 'refresh-key',
            scopes: [],
          },
        },
      }), 'utf-8');

      store.loadStore();

      expect(store.getAuthCode('expired')).toBeUndefined();
      expect(store.getAuthCode('active')?.redmineApiKey).toBe('active-key');
      expect(store.getAccessToken('expired')).toBeUndefined();
      expect(store.getAccessToken('active')?.redmineApiKey).toBe('active-key');
      expect(store.getRefreshToken('refresh')?.redmineApiKey).toBe('refresh-key');

      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      expect(data.authCodes.expired).toBeUndefined();
      expect(data.accessTokens.expired).toBeUndefined();
      expect(data.refreshTokens.refresh).toBeDefined();
    });
  });
});
