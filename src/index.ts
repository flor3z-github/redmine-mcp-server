#!/usr/bin/env node

// Buffer compatibility polyfill for Node.js environments
if (Buffer.prototype && !Buffer.prototype.subarray) {
  Buffer.prototype.subarray = Buffer.prototype.slice;
}

import { runServer } from './server.js';

// Enhanced error handling for DXT environment
const logError = (context: string, error: unknown) => {
  const timestamp = new Date().toISOString();
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (logLevel === 'debug') {
    console.error(`[${timestamp}] [ERROR] ${context}:`, error);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] [ERROR] ${context}: ${message}`);
  }
};


// Handle uncaught errors with better logging
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (error) => {
  logError('Unhandled rejection', error);
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 100);
});

// Validate environment before starting
const validateEnvironment = (): boolean => {
  const required = ['REDMINE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`[${new Date().toISOString()}] [ERROR] Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  // Check authentication (only required for stdio mode)
  const transportType = process.argv.includes('--transport')
    ? process.argv[process.argv.indexOf('--transport') + 1]
    : process.env.MCP_TRANSPORT || 'stdio';

  if (transportType !== 'streamable-http') {
    const hasApiKey = !!process.env.REDMINE_API_KEY;
    const hasBasicAuth = !!(process.env.REDMINE_USERNAME && process.env.REDMINE_PASSWORD);

    if (!hasApiKey && !hasBasicAuth) {
      console.error(`[${new Date().toISOString()}] [ERROR] Either REDMINE_API_KEY or REDMINE_USERNAME+REDMINE_PASSWORD must be provided`);
      return false;
    }
  }
  
  // Validate URL format
  try {
    const redmineUrl = process.env.REDMINE_URL;
    if (!redmineUrl) {
      console.error(`[${new Date().toISOString()}] [ERROR] REDMINE_URL is not set`);
      return false;
    }
    new globalThis.URL(redmineUrl);
  } catch {
    console.error(`[${new Date().toISOString()}] [ERROR] Invalid REDMINE_URL format: ${process.env.REDMINE_URL}`);
    return false;
  }
  
  return true;
};

// Main execution
const main = async () => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [INFO] Starting Redmine MCP Server v1.0.0`);
  console.error(`[${timestamp}] [DEBUG] Process ID: ${process.pid}`);
  
  // Validate environment
  if (!validateEnvironment()) {
    console.error(`[${timestamp}] [ERROR] Environment validation failed`);
    process.exit(1);
  }
  
  // Log configuration (without sensitive data)
  const logLevel = process.env.LOG_LEVEL || 'info';
  if (logLevel === 'debug') {
    console.error(`[${timestamp}] [DEBUG] Configuration:`);
    console.error(`[${timestamp}] [DEBUG] - REDMINE_URL: ${process.env.REDMINE_URL}`);
    console.error(`[${timestamp}] [DEBUG] - SSL_VERIFY: ${process.env.REDMINE_SSL_VERIFY || 'true'}`);
    console.error(`[${timestamp}] [DEBUG] - REQUEST_TIMEOUT: ${process.env.REDMINE_REQUEST_TIMEOUT || '30000'}ms`);
    console.error(`[${timestamp}] [DEBUG] - LOG_LEVEL: ${logLevel}`);
    console.error(`[${timestamp}] [DEBUG] - AUTH_METHOD: ${process.env.REDMINE_API_KEY ? 'API_KEY' : 'BASIC_AUTH'}`);
  }
  
  try {
    await runServer();
    console.error(`[${timestamp}] [INFO] Server started successfully`);
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
};

// Run the main function
main();