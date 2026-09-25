import { validateEnvironment } from "@/lib/config/env-validation";

describe("Production Deployment Readiness Suite", () => {
  describe("1. Environment Configuration Integrity", () => {
    it("validates compliant production environment configuration", () => {
      const validEnv = {
        NODE_ENV: "production",
        AUTH_JWT_SECRET: "super_secure_production_jwt_signing_key_2026_at_least_32_bytes_long",
        DATABASE_URL: "libsql://thaibahive-prod.turso.io",
        DB_REPLICA_URLS: "libsql://thaibahive-replica.turso.io",
        NEXT_PUBLIC_APP_URL: "https://hive.thaiba.edu.in",
        HEALTH_SECRET: "health_probe_secret_key_2026",
        METRICS_SECRET: "metrics_scrape_secret_2026",
      };

      const result = validateEnvironment(validEnv);
      expect(result.valid).toBe(true);
      expect(result.data?.NODE_ENV).toBe("production");
      expect(result.data?.DB_REPLICA_URLS).toContain("thaibahive-replica");
    });

    it("accepts legacy JWT_SECRET alias for backward compatibility", () => {
      const legacyEnv = {
        NODE_ENV: "production",
        JWT_SECRET: "super_secure_production_jwt_signing_key_2026_at_least_32_bytes_long",
        NEXT_PUBLIC_APP_URL: "https://hive.thaiba.edu.in",
      };

      const result = validateEnvironment(legacyEnv);
      expect(result.valid).toBe(true);
    });

    it("rejects configuration with no JWT signing secret", () => {
      const missingSecretEnv = {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://hive.thaiba.edu.in",
      };

      const result = validateEnvironment(missingSecretEnv);
      expect(result.valid).toBe(false);
      expect(result.errors?.AUTH_JWT_SECRET).toBeDefined();
    });

    it("rejects weak JWT secret for production token security", () => {
      const invalidEnv = {
        NODE_ENV: "production",
        AUTH_JWT_SECRET: "short",
      };

      const result = validateEnvironment(invalidEnv);
      expect(result.valid).toBe(false);
      expect(result.errors?.AUTH_JWT_SECRET).toBeDefined();
    });

    it("rejects weak shared secrets for health and metrics endpoints", () => {
      const invalidEnv = {
        NODE_ENV: "production",
        AUTH_JWT_SECRET: "super_secure_production_jwt_signing_key_2026_at_least_32_bytes_long",
        HEALTH_SECRET: "short",
        METRICS_SECRET: "short",
      };

      const result = validateEnvironment(invalidEnv);
      expect(result.valid).toBe(false);
      expect(result.errors?.HEALTH_SECRET).toBeDefined();
      expect(result.errors?.METRICS_SECRET).toBeDefined();
    });

    it("rejects invalid App URLs", () => {
      const invalidEnv = {
        JWT_SECRET: "secure_key_1234567890_valid_length",
        NEXT_PUBLIC_APP_URL: "not-a-valid-url",
      };

      const result = validateEnvironment(invalidEnv);
      expect(result.valid).toBe(false);
      expect(result.errors?.NEXT_PUBLIC_APP_URL).toBeDefined();
    });
  });
});
