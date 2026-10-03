import { validateProductionStartup, validateProductionStartupOrThrow } from "@/lib/config/env-validation";

describe("D5 - Production Environment Config Safety Validation", () => {
  const compliantEnv: Record<string, string> = {
    NODE_ENV: "production",
    AUTH_JWT_SECRET: "super_secure_production_jwt_signing_key_2026_at_least_32_bytes_long",
    DATABASE_URL: "postgresql://postgres:secret@db.thaibahive.internal:5432/thaibahive_prod",
    APP_URL: "https://thaibahive.com",
    NEXT_PUBLIC_APP_URL: "https://thaibahive.com",
    SYSTEM_UPDATE_SECRET: "system_update_secret_key_2026_safe",
    CRON_SECRET: "cron_runner_secret_key_2026_safe",
    HEALTH_SECRET: "health_probe_secret_key_2026",
    METRICS_SECRET: "metrics_scrape_secret_2026",
    PII_ENCRYPTION_KEY: "pii_aes256_encryption_key_at_least_32_chars_long",
    RECEIPT_SIGNING_KEY: "tax_receipt_cryptographic_signing_key_32_chars",
  };

  it("passes without throwing on a complete and valid production environment set", () => {
    const result = validateProductionStartup(compliantEnv);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    expect(() => validateProductionStartupOrThrow(compliantEnv)).not.toThrow();
  });

  it("throws when AUTH_JWT_SECRET and legacy JWT_SECRET are missing", () => {
    const testEnv = { ...compliantEnv };
    delete testEnv.AUTH_JWT_SECRET;
    delete testEnv.JWT_SECRET;

    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("AUTH_JWT_SECRET"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/Production startup validation failed/);
    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/AUTH_JWT_SECRET/);
  });

  it("throws when AUTH_JWT_SECRET is shorter than 32 characters", () => {
    const testEnv = {
      ...compliantEnv,
      AUTH_JWT_SECRET: "short_secret_only_24_chars_",
    };

    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("AUTH_JWT_SECRET") && e.includes("minimum 32 characters"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/minimum 32 characters required/);
  });

  it("throws when DATABASE_URL is missing or blank", () => {
    const testEnv = { ...compliantEnv };
    delete testEnv.DATABASE_URL;

    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("DATABASE_URL"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/DATABASE_URL/);
  });

  it("throws when APP_URL / NEXT_PUBLIC_APP_URL is missing or malformed", () => {
    const testEnv = { ...compliantEnv };
    delete testEnv.APP_URL;
    delete testEnv.NEXT_PUBLIC_APP_URL;

    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("APP_URL"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/APP_URL/);

    const malformedEnv = {
      ...compliantEnv,
      APP_URL: "not-a-valid-url",
      NEXT_PUBLIC_APP_URL: "not-a-valid-url",
    };
    const malformedResult = validateProductionStartup(malformedEnv);
    expect(malformedResult.valid).toBe(false);
    expect(malformedResult.errors.some((e) => e.includes("Invalid URL format"))).toBe(true);
  });

  it("throws when SYSTEM_UPDATE_SECRET is missing or shorter than 16 characters", () => {
    const testEnv = { ...compliantEnv, SYSTEM_UPDATE_SECRET: "short" };
    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("SYSTEM_UPDATE_SECRET") && e.includes("minimum 16 characters"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/SYSTEM_UPDATE_SECRET/);
  });

  it("throws when CRON_SECRET is missing or shorter than 16 characters", () => {
    const testEnv = { ...compliantEnv, CRON_SECRET: "short" };
    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("CRON_SECRET") && e.includes("minimum 16 characters"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/CRON_SECRET/);
  });

  it("throws when PII_ENCRYPTION_KEY is missing or shorter than 32 characters", () => {
    const testEnv = { ...compliantEnv, PII_ENCRYPTION_KEY: "short_key" };
    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("PII_ENCRYPTION_KEY") && e.includes("minimum 32 characters"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it("throws when RECEIPT_SIGNING_KEY is missing or shorter than 32 characters", () => {
    const testEnv = { ...compliantEnv, RECEIPT_SIGNING_KEY: "short_key" };
    const result = validateProductionStartup(testEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("RECEIPT_SIGNING_KEY") && e.includes("minimum 32 characters"))).toBe(true);

    expect(() => validateProductionStartupOrThrow(testEnv)).toThrow(/RECEIPT_SIGNING_KEY/);
  });

  it("validates conditional Redis settings when distributed rate limiting is enabled", () => {
    const distributedEnv = {
      ...compliantEnv,
      ENABLE_DISTRIBUTED_RATE_LIMIT: "true",
    };

    // Fails without Redis URL or cluster nodes
    const failedResult = validateProductionStartup(distributedEnv);
    expect(failedResult.valid).toBe(false);
    expect(failedResult.errors.some((e) => e.includes("REDIS_URL"))).toBe(true);

    // Passes when REDIS_URL is provided
    const passedEnv = {
      ...distributedEnv,
      REDIS_URL: "redis://default:secret@redis.internal:6379",
    };
    expect(validateProductionStartup(passedEnv).valid).toBe(true);
  });

  it("validates payment webhook secret when payments are enabled", () => {
    const paymentEnv = {
      ...compliantEnv,
      ENABLE_PAYMENTS: "true",
    };

    // Fails without payment secret
    const failedResult = validateProductionStartup(paymentEnv);
    expect(failedResult.valid).toBe(false);
    expect(failedResult.errors.some((e) => e.includes("PAYMENT_WEBHOOK_SECRET"))).toBe(true);

    // Passes when STRIPE_WEBHOOK_SECRET is provided
    const passedEnv = {
      ...paymentEnv,
      STRIPE_WEBHOOK_SECRET: "whsec_super_secret_webhook_signing_key_2026",
    };
    expect(validateProductionStartup(passedEnv).valid).toBe(true);
  });

  it("never logs or includes actual secret values in error messages", () => {
    const secretValue = "super_secret_forbidden_text_value_12345";
    const testEnv = {
      ...compliantEnv,
      AUTH_JWT_SECRET: secretValue.slice(0, 10), // too short
      SYSTEM_UPDATE_SECRET: secretValue.slice(0, 5), // too short
    };

    try {
      validateProductionStartupOrThrow(testEnv);
      throw new Error("Should have thrown");
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(secretValue.slice(0, 10));
      expect(msg).not.toContain(secretValue.slice(0, 5));
      expect(msg).toContain("characters provided");
    }
  });
});
