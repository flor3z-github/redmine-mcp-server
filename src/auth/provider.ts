import { randomUUID, randomBytes } from 'node:crypto';
import type { Response, Request } from 'express';
import axios from 'axios';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthTokens, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  getClient,
  registerClient,
  storeAuthCode,
  getAuthCode,
  deleteAuthCode,
  storeAccessToken,
  getAccessToken,
  deleteAccessToken,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from './store.js';
import { renderAuthPage } from './page.js';

// In-memory map for authorize → callback bridge
interface AuthSession {
  clientId: string;
  params: AuthorizationParams;
}

const authSessions = new Map<string, AuthSession>();

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export class RedmineOAuthProvider implements OAuthServerProvider {
  private redmineUrl: string;

  constructor(redmineUrl: string) {
    this.redmineUrl = redmineUrl;
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId: string) => getClient(clientId),
      registerClient: (client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>) =>
        registerClient(client),
    };
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const authSessionToken = randomUUID();
    authSessions.set(authSessionToken, {
      clientId: client.client_id,
      params,
    });

    // Set a 10-minute timeout for auth sessions
    setTimeout(() => {
      authSessions.delete(authSessionToken);
    }, 10 * 60 * 1000);

    const html = renderAuthPage({
      redmineUrl: this.redmineUrl,
      authSessionToken,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Handle the form POST from the auth page.
   * Validates the API key against Redmine, then redirects with an auth code.
   */
  async handleAuthCallback(req: Request, res: Response): Promise<void> {
    const { authSessionToken, apiKey } = req.body as {
      authSessionToken?: string;
      apiKey?: string;
    };

    if (!authSessionToken || !authSessions.has(authSessionToken)) {
      res.status(400).send('Invalid or expired auth session');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      const html = renderAuthPage({
        redmineUrl: this.redmineUrl,
        authSessionToken,
        error: 'API Key를 입력해주세요.',
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }

    // Validate API key against Redmine
    try {
      await axios.get(`${this.redmineUrl}/users/current.json`, {
        headers: { 'X-Redmine-API-Key': apiKey.trim() },
        timeout: 10000,
      });
    } catch {
      const html = renderAuthPage({
        redmineUrl: this.redmineUrl,
        authSessionToken,
        error: 'API Key가 유효하지 않습니다. 다시 확인해주세요.',
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }

    const session = authSessions.get(authSessionToken)!;
    authSessions.delete(authSessionToken);

    // Generate auth code
    const code = generateToken();
    storeAuthCode(code, {
      clientId: session.clientId,
      redmineApiKey: apiKey.trim(),
      codeChallenge: session.params.codeChallenge,
      redirectUri: session.params.redirectUri,
      scopes: session.params.scopes || [],
    });

    // Redirect back to the client with the auth code
    const redirectUrl = new URL(session.params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (session.params.state) {
      redirectUrl.searchParams.set('state', session.params.state);
    }

    res.redirect(302, redirectUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const record = getAuthCode(authorizationCode);
    if (!record) {
      throw new Error('Invalid or expired authorization code');
    }
    return record.codeChallenge;
  }

  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const record = getAuthCode(authorizationCode);
    if (!record) {
      throw new Error('Invalid or expired authorization code');
    }

    // Consume the auth code (one-time use)
    deleteAuthCode(authorizationCode);

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    storeAccessToken(accessToken, {
      clientId: record.clientId,
      redmineApiKey: record.redmineApiKey,
      scopes: record.scopes,
    });

    storeRefreshToken(refreshToken, {
      clientId: record.clientId,
      redmineApiKey: record.redmineApiKey,
      scopes: record.scopes,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
      refresh_token: refreshToken,
      scope: record.scopes.join(' '),
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    const record = getRefreshToken(refreshToken);
    if (!record) {
      throw new Error('Invalid refresh token');
    }

    // Generate a new access token
    const newAccessToken = generateToken();

    storeAccessToken(newAccessToken, {
      clientId: record.clientId,
      redmineApiKey: record.redmineApiKey,
      scopes: record.scopes,
    });

    // Generate a new refresh token (rotate)
    const newRefreshToken = generateToken();
    storeRefreshToken(newRefreshToken, {
      clientId: record.clientId,
      redmineApiKey: record.redmineApiKey,
      scopes: record.scopes,
    });
    deleteRefreshToken(refreshToken);

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
      refresh_token: newRefreshToken,
      scope: record.scopes.join(' '),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = getAccessToken(token);
    if (!record) {
      throw new Error('Invalid or expired access token');
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      extra: {
        redmineApiKey: record.redmineApiKey,
      },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const { token, token_type_hint } = request;

    if (token_type_hint === 'refresh_token') {
      deleteRefreshToken(token);
    } else if (token_type_hint === 'access_token') {
      deleteAccessToken(token);
    } else {
      // Try both
      deleteAccessToken(token);
      deleteRefreshToken(token);
    }
  }
}
