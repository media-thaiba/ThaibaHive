import { sanitizeErrorMessage, extractCleanStack } from "./lib/diagnostics/sanitize";

const GLOBAL_ERROR_BOUNDARY_KEY = Symbol.for("__thaiba_error_boundary_registered__");

let cachedCaptureException: ((err: unknown, ctx?: Record<string, unknown>) => void) | null = null;

function extractErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const anyErr = err as Record<string, any>;
  return anyErr.code || anyErr.cause?.code || undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Pre-cache Sentry capture synchronously so handlers do not depend on dynamic import resolution
    try {
      const sentry = await import("@/lib/diagnostics/sentry");
      cachedCaptureException = sentry.captureException;
    } catch {
      // Sentry module unavailable or not configured
    }

    // 1. Process-level error boundary (guarded against hot-reload double registration)
    const g = globalThis as unknown as { [GLOBAL_ERROR_BOUNDARY_KEY]?: boolean };
    if (!g[GLOBAL_ERROR_BOUNDARY_KEY]) {
      g[GLOBAL_ERROR_BOUNDARY_KEY] = true;

      let isHandlingRejection = false;
      let isHandlingUncaught = false;

      // Unhandled Promise Rejections:
      // On Vercel serverless, registering a handler suppresses Node's default crash,
      // keeping the warm microVM alive so concurrent in-flight requests are not terminated.
      // Accepted risk: potentially inconsistent state in exchange for zero collateral request drops.
      process.on("unhandledRejection", (reason: unknown) => {
        if (isHandlingRejection) {
          process.stderr.write("[FATAL] Re-entrant unhandledRejection detected\n");
          return;
        }
        isHandlingRejection = true;
        try {
          const errorObj = reason instanceof Error ? reason : new Error(String(reason));
          const code = extractErrorCode(reason);
          const sanitizedMessage = sanitizeErrorMessage(errorObj.message);
          const cleanStack = extractCleanStack(errorObj);

          const payload = {
            event: "unhandled_rejection",
            code,
            message: sanitizedMessage,
            stack: cleanStack,
            timestamp: new Date().toISOString(),
          };
          process.stderr.write(JSON.stringify(payload) + "\n");

          if (cachedCaptureException) {
            try {
              // Pass sanitized error to prevent PII leakage to external Sentry drains
              const safeErr = new Error(sanitizedMessage);
              safeErr.name = errorObj.name;
              if (code) (safeErr as any).code = code;
              safeErr.stack = cleanStack;
              cachedCaptureException(safeErr, { origin: "unhandledRejection", code });
            } catch {}
          }
        } catch {
          process.stderr.write("[FATAL] Error writing unhandledRejection diagnostic to stderr\n");
        } finally {
          isHandlingRejection = false;
          // Opt-in exit for self-hosted container deployments.
          // By default (Vercel serverless, local next start, CI, debugging), the process survives
          // to protect concurrent in-flight requests on warm microVMs.
          if (process.env.EXIT_ON_UNHANDLED_REJECTION === "1") {
            process.exit(1);
          }
        }
      });

      // Uncaught Exceptions:
      // Using uncaughtExceptionMonitor provides observe-only semantics without suppressing
      // Node.js's native crash behavior (exit code 1). Diagnostics and telemetry are captured
      // synchronously to stderr before the runtime terminates.
      process.on("uncaughtExceptionMonitor", (error: Error, origin: string) => {
        if (isHandlingUncaught) {
          process.stderr.write("[FATAL] Re-entrant uncaughtException detected\n");
          return;
        }
        isHandlingUncaught = true;
        try {
          const code = extractErrorCode(error);
          const sanitizedMessage = sanitizeErrorMessage(error?.message || String(error));
          const cleanStack = extractCleanStack(error);

          const payload = {
            event: "uncaught_exception",
            origin,
            code,
            message: sanitizedMessage,
            stack: cleanStack,
            timestamp: new Date().toISOString(),
          };
          process.stderr.write(JSON.stringify(payload) + "\n");

          if (cachedCaptureException) {
            try {
              const safeErr = new Error(sanitizedMessage);
              safeErr.name = error.name;
              if (code) (safeErr as any).code = code;
              safeErr.stack = cleanStack;
              cachedCaptureException(safeErr, { origin: "uncaughtExceptionMonitor", originDetail: origin, code });
            } catch {}
          }
        } catch {
          process.stderr.write("[FATAL] Error writing uncaughtException diagnostic to stderr\n");
        } finally {
          isHandlingUncaught = false;
        }
      });
    }

    // 2. Validate required production environment variables on startup (MUST throw on failure)
    if (process.env.NODE_ENV === "production" && process.env.SKIP_ENV_VALIDATION !== "true") {
      const { validateProductionStartupOrThrow } = await import("@/lib/config/env-validation");
      validateProductionStartupOrThrow(process.env);
    }

    // 3. Skip distributed state initialization during Next.js build phase entirely
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return;
    }

    // 4. Runtime Revocation Mesh startup
    // Note: Database check in packages/auth/session.ts (staff.tokenVersion + userSessions.status)
    // is authoritative on every request. Mesh failure is logged loudly but does not crash startup.
    try {
      const { initRevocationMesh } = await import("@/lib/identity/revocation-mesh");
      initRevocationMesh();
    } catch (err) {
      const errorPayload = {
        event: "revocation_mesh_init_failed",
        error: sanitizeErrorMessage(err instanceof Error ? err.message : String(err)),
        timestamp: new Date().toISOString(),
      };
      process.stderr.write(JSON.stringify(errorPayload) + "\n");
    }
  }
}
