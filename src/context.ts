import { AsyncLocalStorage } from 'node:async_hooks';

export interface SessionCredentials {
  redmineApiKey?: string;
  redmineUsername?: string;
  redminePassword?: string;
}

export const sessionStore = new AsyncLocalStorage<SessionCredentials>();
