import { z } from 'zod';

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
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    otelLevel: z.string().default('none'),
  }),
}).refine(
  (config) => {
    // Either API key or username/password must be provided
    const hasApiKey = !!config.redmine.apiKey;
    const hasBasicAuth = !!config.redmine.username && !!config.redmine.password;
    return hasApiKey || hasBasicAuth;
  },
  {
    message: 'Either API key or username/password must be provided for authentication',
  }
);

export type RedmineConfig = z.infer<typeof configSchema>;

// Parse and validate configuration
export function loadConfig(): RedmineConfig {
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