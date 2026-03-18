import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

import axios from 'axios';
import { RedmineOAuthProvider } from '../../../src/auth/provider.js';
import { loadStore, storeAuthCode, storeAccessToken, storeRefreshToken, getAccessToken, getRefreshToken } from '../../../src/auth/store.js';

describe('RedmineOAuthProvider', () => {
  let provider: RedmineOAuthProvider;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-provider-test-'));
    process.env.MCP_DATA_DIR = tmpDir;
    loadStore();

    provider = new RedmineOAuthProvider('https://redmine.example.com');
    vi.clearAllMocks();
  });

  describe('clientsStore', () => {
    it('should register and retrieve clients', async () => {
      const store = provider.clientsStore;
      const client = await store.registerClient!({
        redirect_uris: ['http://localhost/callback'],
        client_name: 'test',
      } as any);

      expect(client.client_id).toBeDefined();

      const retrieved = await store.getClient(client.client_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.client_id).toBe(client.client_id);
    });
  });

  describe('authorize', () => {
    it('should render auth page HTML', async () => {
      const client = await provider.clientsStore.registerClient!({
        redirect_uris: ['http://localhost/callback'],
      } as any);

      let sentHtml = '';
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn((html: string) => { sentHtml = html; }),
      };

      await provider.authorize(
        client,
        {
          state: 'test-state',
          scopes: ['read'],
          codeChallenge: 'challenge-123',
          redirectUri: 'http://localhost/callback',
        },
        mockRes as any
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(sentHtml).toContain('Redmine MCP Server');
      expect(sentHtml).toContain('redmine.example.com');
      expect(sentHtml).toContain('authSessionToken');
    });
  });

  describe('handleAuthCallback', () => {
    it('should reject invalid auth session', async () => {
      const mockReq = {
        body: { authSessionToken: 'invalid', apiKey: 'test' },
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await provider.handleAuthCallback(mockReq as any, mockRes as any);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject empty API key', async () => {
      // First authorize to create a session
      const client = await provider.clientsStore.registerClient!({
        redirect_uris: ['http://localhost/callback'],
      } as any);

      let authSessionToken = '';
      const authRes = {
        setHeader: vi.fn(),
        send: vi.fn((html: string) => {
          const match = html.match(/name="authSessionToken" value="([^"]+)"/);
          if (match) authSessionToken = match[1];
        }),
      };

      await provider.authorize(
        client,
        { codeChallenge: 'ch', redirectUri: 'http://localhost/callback' } as any,
        authRes as any
      );

      // Submit with empty API key
      let responseHtml = '';
      const callbackRes = {
        setHeader: vi.fn(),
        send: vi.fn((html: string) => { responseHtml = html; }),
      };

      await provider.handleAuthCallback(
        { body: { authSessionToken, apiKey: '' } } as any,
        callbackRes as any
      );

      expect(responseHtml).toContain('API Key를 입력해주세요');
    });
  });

  describe('challengeForAuthorizationCode', () => {
    it('should return the code challenge', async () => {
      storeAuthCode('code-1', {
        clientId: 'c1',
        redmineApiKey: 'key',
        codeChallenge: 'my-challenge',
        redirectUri: 'http://localhost/cb',
        scopes: [],
      });

      const challenge = await provider.challengeForAuthorizationCode({} as any, 'code-1');
      expect(challenge).toBe('my-challenge');
    });

    it('should throw for invalid code', async () => {
      await expect(
        provider.challengeForAuthorizationCode({} as any, 'invalid')
      ).rejects.toThrow('Invalid or expired authorization code');
    });
  });

  describe('exchangeAuthorizationCode', () => {
    it('should exchange code for tokens', async () => {
      storeAuthCode('exchange-code', {
        clientId: 'c1',
        redmineApiKey: 'my-api-key',
        codeChallenge: 'ch',
        redirectUri: 'http://localhost/cb',
        scopes: ['read'],
      });

      const tokens = await provider.exchangeAuthorizationCode(
        {} as any,
        'exchange-code'
      );

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBe(30 * 24 * 60 * 60);

      // Verify token is stored with correct API key
      const record = getAccessToken(tokens.access_token);
      expect(record?.redmineApiKey).toBe('my-api-key');
    });

    it('should consume the auth code (one-time use)', async () => {
      storeAuthCode('one-time', {
        clientId: 'c1',
        redmineApiKey: 'key',
        codeChallenge: 'ch',
        redirectUri: 'http://localhost/cb',
        scopes: [],
      });

      await provider.exchangeAuthorizationCode({} as any, 'one-time');

      await expect(
        provider.exchangeAuthorizationCode({} as any, 'one-time')
      ).rejects.toThrow();
    });
  });

  describe('exchangeRefreshToken', () => {
    it('should issue new tokens and rotate refresh token', async () => {
      storeRefreshToken('refresh-old', {
        clientId: 'c1',
        redmineApiKey: 'key',
        scopes: ['read'],
      });

      const tokens = await provider.exchangeRefreshToken({} as any, 'refresh-old');

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.refresh_token).not.toBe('refresh-old');

      // Old refresh token should be deleted
      expect(getRefreshToken('refresh-old')).toBeUndefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should return AuthInfo with redmineApiKey in extra', async () => {
      storeAccessToken('verify-token', {
        clientId: 'c1',
        redmineApiKey: 'my-key',
        scopes: ['read'],
      });

      const authInfo = await provider.verifyAccessToken('verify-token');

      expect(authInfo.token).toBe('verify-token');
      expect(authInfo.clientId).toBe('c1');
      expect(authInfo.scopes).toEqual(['read']);
      expect(authInfo.extra?.redmineApiKey).toBe('my-key');
    });

    it('should throw for invalid token', async () => {
      await expect(
        provider.verifyAccessToken('invalid')
      ).rejects.toThrow('Invalid or expired access token');
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      storeAccessToken('revoke-at', {
        clientId: 'c1',
        redmineApiKey: 'key',
        scopes: [],
      });

      await provider.revokeToken({} as any, {
        token: 'revoke-at',
        token_type_hint: 'access_token',
      });

      expect(getAccessToken('revoke-at')).toBeUndefined();
    });

    it('should revoke refresh token', async () => {
      storeRefreshToken('revoke-rt', {
        clientId: 'c1',
        redmineApiKey: 'key',
        scopes: [],
      });

      await provider.revokeToken({} as any, {
        token: 'revoke-rt',
        token_type_hint: 'refresh_token',
      });

      expect(getRefreshToken('revoke-rt')).toBeUndefined();
    });
  });
});
