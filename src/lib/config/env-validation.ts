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