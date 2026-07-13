// Telemetry setup
import { config } from './config.js';

// Simple telemetry setup
// You can extend this to use OpenTelemetry or other telemetry providers

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}

class Telemetry {
  private enabled: boolean;
  private events: TelemetryEvent[] = [];

  constructor() {
    this.enabled = config.logging.otelLevel !== 'none';
  }

  logEvent(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: TelemetryEvent = {
      name,
      properties,
      timestamp: new Date(),
    };

    this.events.push(event);

    // In production, you would send this to a telemetry service
    if (config.logging.level === 'debug') {
      console.error('Telemetry event:', event);
    }
  }

  logToolUsage(toolName: string, success: boolean, duration: number): void {
    this.logEvent('tool_usage', {
      tool: toolName,
      success,
      duration,
    });
  }

  logApiCall(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.logEvent('api_call', {
      endpoint,
      method,
      statusCode,
      duration,
    });
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.logEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Export singleton instance
export const telemetry = new Telemetry();

// Middleware to track API calls
export function trackApiCall(
  endpoint: string,
  method: string
): { start: () => void; end: (arg: number) => void } {
  const startTime = Date.now();

  return {
    start: () => {
      if (config.logging.level === 'debug') {
        console.error(`API Call: ${method} ${endpoint}`);
      }
    },
    end: (statusCode: number) => {
      const duration = Date.now() - startTime;
      // Log the API call completion with status code
      if (config.logging.level === 'debug') {
        console.error(`API Call completed: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);
      }
      telemetry.logApiCall(endpoint, method, statusCode, duration);
    },
  };
}

// Tool execution wrapper
export async function trackToolExecution<T>(
  toolName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (error) {
    telemetry.logError(error as Error, { tool: toolName });
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    telemetry.logToolUsage(toolName, success, duration);
  }
}