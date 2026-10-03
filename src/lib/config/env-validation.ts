import { z } from "zod";

/**
 * Phase 7 hardening (SEC): the runtime authentication layer (@thaiba/auth)
 * reads `AUTH_JWT_SECRET`, not `JWT_SECRET`. This schema now validates the
 * canonical key as the preferred secret and tolerates `JWT_SECRET` only as a
 * deprecated alias, while keeping shared secrets (HEALTH/METRICS) and
 * replica/APM variables part of the production env contract.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_JWT_SECRET: z
    .string()
    .min(16, "AUTH_JWT_SECRET must be at least 16 characters for token cryptographic security")
    .optional(),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET is deprecated in favor of AUTH_JWT_SECRET and must be at least 16 characters")
    .optional(),
  DATABASE_URL: z.string().optional(),
  DB_REPLICA_URLS: z.string().optional(),
  PII_ENCRYPTION_KEY: z.string().optional(),
  HEALTH_SECRET: z.string().min(16, "HEALTH_SECRET must be at least 16 characters").optional(),
  METRICS_SECRET: z.string().min(16, "METRICS_SECRET must be at least 16 characters").optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SENTRY_DSN: z.string().url().optional(),
  APM_TELEMETRY_ENABLED: z.enum(["true", "false"]).optional(),
}).superRefine((data, ctx) => {
  if (!data.AUTH_JWT_SECRET && !data.JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AUTH_JWT_SECRET"],
      message: "AUTH_JWT_SECRET must be configured (or legacy JWT_SECRET) for token signing",
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnvironment(env: Record<string, string | undefined> = process.env): {
  valid: boolean;
  data?: AppEnv;
  errors?: Record<string, string[]>;
} {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "global";
      if (!formattedErrors[field]) formattedErrors[field] = [];
      formattedErrors[field].push(issue.message);
    }
    return { valid: false, errors: formattedErrors };
  }
  return { valid: true, data: parsed.data };
}

export interface ProductionEnvValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProductionStartup(env: Record<string, string | undefined> = process.env): ProductionEnvValidationResult {
  const errors: string[] = [];

  // 1. Canonical JWT Signing Secret (must be at least 32 characters)
  const jwtSecret = env.AUTH_JWT_SECRET || env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push("AUTH_JWT_SECRET: Missing required JWT signing secret (must be at least 32 characters)");
  } else if (jwtSecret.length < 32) {
    errors.push(`AUTH_JWT_SECRET: Key is too short (${jwtSecret.length} characters provided; minimum 32 characters required)`);
  }

  // 2. Database URL
  if (!env.DATABASE_URL || env.DATABASE_URL.trim() === "") {
    errors.push("DATABASE_URL: Missing required database connection string");
  }

  // 3. Application URL
  const appUrl = env.APP_URL || env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.trim() === "") {
    errors.push("APP_URL / NEXT_PUBLIC_APP_URL: Missing required canonical application URL");
  } else {
    try {
      new URL(appUrl);
    } catch {
      errors.push("APP_URL / NEXT_PUBLIC_APP_URL: Invalid URL format");
    }
  }

  // 4. System Update Secret
  if (!env.SYSTEM_UPDATE_SECRET) {
    errors.push("SYSTEM_UPDATE_SECRET: Missing required system update administration secret");
  } else if (env.SYSTEM_UPDATE_SECRET.length < 16) {
    errors.push(`SYSTEM_UPDATE_SECRET: Key is too short (${env.SYSTEM_UPDATE_SECRET.length} characters provided; minimum 16 characters required)`);
  }

  // 5. Cron Trigger Secret
  if (!env.CRON_SECRET) {
    errors.push("CRON_SECRET: Missing required cron/worker execution secret");
  } else if (env.CRON_SECRET.length < 16) {
    errors.push(`CRON_SECRET: Key is too short (${env.CRON_SECRET.length} characters provided; minimum 16 characters required)`);
  }

  // 6. Shared Monitoring Secrets (Health & Metrics)
  if (!env.HEALTH_SECRET) {
    errors.push("HEALTH_SECRET: Missing required health probe authentication secret");
  } else if (env.HEALTH_SECRET.length < 16) {
    errors.push(`HEALTH_SECRET: Key is too short (${env.HEALTH_SECRET.length} characters provided; minimum 16 characters required)`);
  }

  if (!env.METRICS_SECRET) {
    errors.push("METRICS_SECRET: Missing required Prometheus metrics scrape secret");
  } else if (env.METRICS_SECRET.length < 16) {
    errors.push(`METRICS_SECRET: Key is too short (${env.METRICS_SECRET.length} characters provided; minimum 16 characters required)`);
  }

  // 7. PII Encryption Key
  if (!env.PII_ENCRYPTION_KEY) {
    errors.push("PII_ENCRYPTION_KEY: Missing required AES-256 field encryption key");
  } else if (env.PII_ENCRYPTION_KEY.length < 32) {
    errors.push(`PII_ENCRYPTION_KEY: Key is too short (${env.PII_ENCRYPTION_KEY.length} characters provided; minimum 32 characters required)`);
  }

  // 8. Receipt Cryptographic Signing Key
  if (!env.RECEIPT_SIGNING_KEY) {
    errors.push("RECEIPT_SIGNING_KEY: Missing required 80G receipt signing key");
  } else if (env.RECEIPT_SIGNING_KEY.length < 32) {
    errors.push(`RECEIPT_SIGNING_KEY: Key is too short (${env.RECEIPT_SIGNING_KEY.length} characters provided; minimum 32 characters required)`);
  }

  // 9. Conditional Redis Configuration
  const isDistributedRateLimit = env.ENABLE_DISTRIBUTED_RATE_LIMIT === "true" || env.RATE_LIMIT_DRIVER === "redis";
  if (isDistributedRateLimit) {
    const hasRedis = !!(env.REDIS_URL || env.REDIS_CLUSTER_NODES || (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN));
    if (!hasRedis) {
      errors.push("REDIS_URL / REDIS_CLUSTER_NODES: Distributed rate limiting is enabled but no Redis connection string or cluster nodes were configured");
    }
  }

  // 10. Conditional Payment Webhook Secrets
  if (env.ENABLE_PAYMENTS === "true" || env.PAYMENT_GATEWAY === "razorpay" || env.PAYMENT_GATEWAY === "stripe") {
    const hasPaymentSecret = !!(
      (env.RAZORPAY_KEY_SECRET && env.RAZORPAY_KEY_SECRET.length >= 16) ||
      (env.STRIPE_WEBHOOK_SECRET && env.STRIPE_WEBHOOK_SECRET.length >= 16) ||
      (env.PAYMENT_WEBHOOK_SECRET && env.PAYMENT_WEBHOOK_SECRET.length >= 16)
    );
    if (!hasPaymentSecret) {
      errors.push("PAYMENT_WEBHOOK_SECRET: Payment processing is enabled but no valid webhook signing secret (STRIPE_WEBHOOK_SECRET, RAZORPAY_KEY_SECRET, or PAYMENT_WEBHOOK_SECRET) of at least 16 characters is configured");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateProductionStartupOrThrow(env: Record<string, string | undefined> = process.env): void {
  const result = validateProductionStartup(env);
  if (!result.valid) {
    const errorList = result.errors.map((err) => `  - ${err}`).join("\n");
    throw new Error(
      `[FATAL] Production startup validation failed. The following required environment variables are missing or invalid:\n${errorList}\n\nRefusing to boot in production mode with insecure or incomplete configuration.`
    );
  }
}