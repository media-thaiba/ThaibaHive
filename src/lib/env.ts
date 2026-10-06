import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_JWT_SECRET: z
    .string()
    .min(1, "AUTH_JWT_SECRET must be configured")
    .default("dev-jwt-secret-min-32-chars-long-security-key-thaibahive"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .default("http://localhost:3000"),
  ALLOW_PUBLIC_SIGNUP: z.string().optional().default("false"),
  INVITATION_SECRET: z.string().optional(),
  SYSTEM_UPDATE_SECRET: z.string().optional(),
  TENANT_MASTER_KEY: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  DEV_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DIRECT_DATABASE_URL: z.string().optional(),
  DB_POOL_MAX: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_CLUSTER_NODES: z.string().optional(),
  REDIS_CLUSTER_PASSWORD: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  ENABLE_RATE_LIMIT: z.string().optional(),
  ENGAGE_WEBHOOK_SECRET: z.string().optional(),
  MDM_ENROLLMENT_TOKEN: z.string().optional(),
  EVENT_TICKET_KEY: z.string().optional(),
  DOC_SIGNING_SECRET: z.string().optional(),
  ENGAGE_AUTH_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RECEIPT_SIGNING_SECRET: z.string().optional(),
  RECEIPT_SIGNING_KEY: z.string().optional(),
  PAYMENT_ENCRYPTION_KEY: z.string().optional(),
  HEALER_SECRET: z.string().optional(),
  VISITOR_HMAC_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, string | undefined>): Env {
  const targetEnv = customEnv ?? process.env;
  const result = envSchema.safeParse(targetEnv);

  if (!result.success) {
    const formatted = result.error.format();
    console.error("❌ Invalid environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error("Invalid environment variables configuration.");
  }

  // In production runtime, enforce that default dev secrets are not used
  const env = result.data;
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (env.NODE_ENV === "production" && !isBuildPhase) {
    if (!targetEnv.AUTH_JWT_SECRET || targetEnv.AUTH_JWT_SECRET.length < 32 || targetEnv.AUTH_JWT_SECRET === "dev-jwt-secret-min-32-chars-long-security-key-thaibahive") {
      console.error("❌ Production error: AUTH_JWT_SECRET must be set and >= 32 characters in production mode.");
      throw new Error("Missing or invalid production JWT secret.");
    }
  }

  return env;
}

export const env = validateEnv();
