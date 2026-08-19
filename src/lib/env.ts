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
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  ENABLE_RATE_LIMIT: z.string().optional(),
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

  // In production, enforce that default dev secrets are not used
  const env = result.data;
  if (env.NODE_ENV === "production") {
    if (!targetEnv.AUTH_JWT_SECRET) {
      console.error("❌ Production error: AUTH_JWT_SECRET must be set in production mode.");
      throw new Error("Missing production JWT secret.");
    }
  }

  return env;
}

export const env = validateEnv();
