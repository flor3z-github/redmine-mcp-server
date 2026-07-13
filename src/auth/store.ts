import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Types ---

interface AuthCodeRecord {
  clientId: string;
  redmineApiKey: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: number; // epoch ms
}

interface AccessTokenRecord {
  clientId: string;
  redmineApiKey: string;
  scopes: string[];
  expiresAt: number; // epoch ms
}

interface RefreshTokenRecord {
  clientId: string;
  redmineApiKey: string;
  scopes: string[];
}

interface StoreData {
  clients: Record<string, OAuthClientInformationFull>;
  authCodes: Record<string, AuthCodeRecord>;
  accessTokens: Record<string, AccessTokenRecord>;
  refreshTokens: Record<string, RefreshTokenRecord>;
}

// --- Constants ---

const AUTH_CODE_TTL = 5 * 60 * 1000; // 5 minutes
const ACCESS_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const STORE_FILE_MODE = 0o600;

// --- State ---

function createEmptyStore(): StoreData {
  return {
    clients: {},
    authCodes: {},
    accessTokens: {},
    refreshTokens: {},
  };
}

let store: StoreData = createEmptyStore();

function getDataDir(): string {
  return process.env.MCP_DATA_DIR || path.join(__dirname, '..', '..', 'data');
}

function getStoreFile(): string {
  return path.join(getDataDir(), 'oauth-store.json');
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRecord<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? value as Record<string, T> : {};
}

function normalizeStoreData(value: unknown): StoreData {
  const data = isRecord(value) ? value : {};

  return {
    clients: normalizeRecord<OAuthClientInformationFull>(data.clients),
    authCodes: normalizeRecord<AuthCodeRecord>(data.authCodes),
    accessTokens: normalizeRecord<AccessTokenRecord>(data.accessTokens),
    refreshTokens: normalizeRecord<RefreshTokenRecord>(data.refreshTokens),
  };
}

function pruneExpiredRecords(data: StoreData, now = Date.now()): boolean {
  let changed = false;

  for (const [code, record] of Object.entries(data.authCodes)) {
    if (!record || typeof record.expiresAt !== 'number' || now > record.expiresAt) {
      delete data.authCodes[code];
      changed = true;
    }
  }

  for (const [token, record] of Object.entries(data.accessTokens)) {
    if (!record || typeof record.expiresAt !== 'number' || now > record.expiresAt) {
      delete data.accessTokens[token];
      changed = true;
    }
  }

  return changed;
}

// --- Persistence ---

export function loadStore(): void {
  ensureDataDir();
  const file = getStoreFile();
  if (fs.existsSync(file)) {
    try {
      store = normalizeStoreData(JSON.parse(fs.readFileSync(file, 'utf-8')));
      fs.chmodSync(file, STORE_FILE_MODE);
      if (pruneExpiredRecords(store)) {
        saveStore();
      }
      console.error(`[${new Date().toISOString()}] [INFO] OAuth store loaded`);
    } catch {
      console.error(`[${new Date().toISOString()}] [WARN] Failed to load OAuth store, starting fresh`);
      store = createEmptyStore();
    }
  } else {
    store = createEmptyStore();
  }
}

export function saveStore(): void {
  ensureDataDir();
  pruneExpiredRecords(store);

  const file = getStoreFile();
  const tmpFile = `${file}.${process.pid}.${randomUUID()}.tmp`;

  try {
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), {
      encoding: 'utf-8',
      mode: STORE_FILE_MODE,
    });
    fs.renameSync(tmpFile, file);
    fs.chmodSync(file, STORE_FILE_MODE);
  } catch (error) {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    throw error;
  }
}

// --- Clients ---

export function getClient(clientId: string): OAuthClientInformationFull | undefined {
  return store.clients[clientId];
}

export function registerClient(
  client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
): OAuthClientInformationFull {
  const clientId = randomUUID();
  const full: OAuthClientInformationFull = {
    ...client,
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
  };
  store.clients[clientId] = full;
  saveStore();
  return full;
}

// --- Auth Codes ---

export function storeAuthCode(
  code: string,
  record: Omit<AuthCodeRecord, 'expiresAt'>
): void {
  store.authCodes[code] = {
    ...record,
    expiresAt: Date.now() + AUTH_CODE_TTL,
  };
  saveStore();
}

export function getAuthCode(code: string): AuthCodeRecord | undefined {
  const record = store.authCodes[code];
  if (!record) return undefined;
  if (Date.now() > record.expiresAt) {
    delete store.authCodes[code];
    saveStore();
    return undefined;
  }
  return record;
}

export function deleteAuthCode(code: string): void {
  delete store.authCodes[code];
  saveStore();
}

// --- Access Tokens ---

export function storeAccessToken(token: string, record: Omit<AccessTokenRecord, 'expiresAt'>): void {
  store.accessTokens[token] = {
    ...record,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL,
  };
  saveStore();
}

export function getAccessToken(token: string): AccessTokenRecord | undefined {
  const record = store.accessTokens[token];
  if (!record) return undefined;
  if (Date.now() > record.expiresAt) {
    delete store.accessTokens[token];
    saveStore();
    return undefined;
  }
  return record;
}

export function deleteAccessToken(token: string): void {
  delete store.accessTokens[token];
  saveStore();
}

// --- Refresh Tokens ---

export function storeRefreshToken(token: string, record: RefreshTokenRecord): void {
  store.refreshTokens[token] = record;
  saveStore();
}

export function getRefreshToken(token: string): RefreshTokenRecord | undefined {
  return store.refreshTokens[token];
}

export function deleteRefreshToken(token: string): void {
  delete store.refreshTokens[token];
  saveStore();
}

// --- Convenience ---

export function getApiKeyForToken(token: string): string | undefined {
  const record = getAccessToken(token);
  return record?.redmineApiKey;
}

export { AUTH_CODE_TTL, ACCESS_TOKEN_TTL };
export type { AuthCodeRecord, AccessTokenRecord, RefreshTokenRecord, StoreData };
