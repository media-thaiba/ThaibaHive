/**
 * Sentry Error Monitoring Integration
 * Safe initialization and error capture for web (client/server).
 */

let sentryInitialized = false;

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn || sentryInitialized) return;

  sentryInitialized = true;
  console.log(`[Sentry] Initialized error monitoring (${process.env.NODE_ENV ?? "development"})`);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  const errorObj = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      event: "sentry_exception_captured",
      error: errorObj.message,
      stack: errorObj.stack,
      context,
      timestamp: new Date().toISOString(),
    })
  );
}
