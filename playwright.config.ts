import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

import * as fs from "fs";

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const PORT = process.env.PORT || 3000;
const resolvedDbPath = process.env.DATABASE_URL || `file:${path.resolve("dev.db")}`;

// Ensure deterministic secrets across global-setup and webServer process
process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "playwright-e2e-secret-key-32-chars-minimum-jwt";
process.env.CRON_SECRET = process.env.CRON_SECRET || "playwright-e2e-cron-secret-32-chars-minimum";
process.env.METRICS_SECRET = process.env.METRICS_SECRET || "playwright-e2e-metrics-secret-32-chars";
process.env.PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.RECEIPT_SIGNING_KEY = process.env.RECEIPT_SIGNING_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.MDM_ENROLLMENT_TOKEN = process.env.MDM_ENROLLMENT_TOKEN || "playwright-e2e-mdm-secret-token-32";
process.env.PAYMENT_ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.HEALTH_SECRET = process.env.HEALTH_SECRET || "playwright-e2e-health-secret-32-chars";
process.env.SYSTEM_UPDATE_SECRET = process.env.SYSTEM_UPDATE_SECRET || "playwright-e2e-system-update-secret-32-chars";
process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;
process.env.BIOMETRIC_MASTER_KEY = process.env.BIOMETRIC_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.TENANT_ENCRYPTION_MASTER_KEY = process.env.TENANT_ENCRYPTION_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["line"], ["html"]] : "list",
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  globalSetup: require.resolve("./e2e/global-setup"),
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `node scripts/start-playwright-server.js`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      HEALTH_SECRET: process.env.HEALTH_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      METRICS_SECRET: process.env.METRICS_SECRET,
      PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY,
      RECEIPT_SIGNING_KEY: process.env.RECEIPT_SIGNING_KEY,
      MDM_ENROLLMENT_TOKEN: process.env.MDM_ENROLLMENT_TOKEN,
      PAYMENT_ENCRYPTION_KEY: process.env.PAYMENT_ENCRYPTION_KEY,
      SYSTEM_UPDATE_SECRET: process.env.SYSTEM_UPDATE_SECRET,
      PLAYWRIGHT_TEST: "true",
      PORT: String(PORT),
      DATABASE_URL: resolvedDbPath,
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
      BIOMETRIC_MASTER_KEY: process.env.BIOMETRIC_MASTER_KEY,
      TENANT_ENCRYPTION_MASTER_KEY: process.env.TENANT_ENCRYPTION_MASTER_KEY,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      APP_URL: `http://localhost:${PORT}`,
    },
  },
});
