import { z } from 'zod';

// CLI argument parsing helpers
function getCliArg(name: string): string | undefined {
  const prefix = `--${name}`;
  const idx = process.argv.indexOf(prefix);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqArg = process.argv.find(a => a.startsWith(`${prefix}=`));
  if (eqArg) {
    return eqArg.split('=')[1];
  }
  return undefined;
}

// Configuration schema
const configSchema = z.object({
  redmine: z.object({
    url: z.string().url('Invalid Redmine URL'),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    sslVerify: z.boolean().default(true),
    caCert: z.string().optional(),
    requestTimeout: z.number().default(30000),
    maxRetries: z.number().default(3),
  }),
  transport: z.object({
    type: z.enum(['stdio', 'streamable-http']).default('stdio'),
    port: z.number().default(3000),
    host: z.string().default('127.0.0.1'),
    issuerUrl: z.string().url().optional(),
    dataDir: z.string().optional(),
    tlsCert: z.string().optional(),
    tlsKey: z.string().optional(),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    otelLevel: z.string().default('none'),
  }),
}).refine(
  (config) => {
    // HTTP mode: credentials come from per-request headers, server-level auth is optional
    if (config.transport.type === 'streamable-http') {
      return true;
    }
    // stdio mode: server-level auth is required
    const hasApiKey = !!config.redmine.apiKey;
    const hasBasicAuth = !!config.redmine.username && !!config.redmine.password;
    return hasApiKey || hasBasicAuth;
  },
  {
    message: 'Either API key or username/password must be provided for authentication (stdio mode)',
  }
);

export type RedmineConfig = z.infer<typeof configSchema>;

// Parse and validate configuration
export function loadConfig(): RedmineConfig {
  // CLI args override env vars
  const transportType = getCliArg('transport') || process.env.MCP_TRANSPORT || 'stdio';
  const portStr = getCliArg('port') || process.env.MCP_PORT;
  const host = getCliArg('host') || process.env.MCP_HOST || '127.0.0.1';

  const config = {
    redmine: {
      url: process.env.REDMINE_URL,
      apiKey: process.env.REDMINE_API_KEY,
      username: process.env.REDMINE_USERNAME,
      password: process.env.REDMINE_PASSWORD,
      sslVerify: process.env.REDMINE_SSL_VERIFY !== 'false',
      caCert: process.env.REDMINE_CA_CERT,
      requestTimeout: process.env.REDMINE_REQUEST_TIMEOUT
        ? parseInt(process.env.REDMINE_REQUEST_TIMEOUT, 10)
        : 30000,
      maxRetries: process.env.REDMINE_MAX_RETRIES
        ? parseInt(process.env.REDMINE_MAX_RETRIES, 10)
        : 3,
    },
    transport: {
      type: transportType,
      port: portStr ? parseInt(portStr, 10) : 3000,
      host,
      issuerUrl: process.env.MCP_ISSUER_URL,
      dataDir: process.env.MCP_DATA_DIR,
      tlsCert: process.env.MCP_TLS_CERT,
      tlsKey: process.env.MCP_TLS_KEY,
    },
    logging: {
      level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      otelLevel: process.env.OTEL_LOG_LEVEL || 'none',
    },
  };

  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated configuration
export const config = loadConfig();
