import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const PORT = process.env.PORT || 3000;
const envFlag = fs.existsSync(".env") ? "--env-file=.env " : "";
const resolvedDbPath = process.env.DATABASE_URL || `file:${path.resolve("dev.db")}`;

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
    command: `node ${envFlag}.next/standalone/server.js`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      HEALTH_SECRET: process.env.HEALTH_SECRET || crypto.randomBytes(32).toString("hex"),
      PLAYWRIGHT_TEST: "true",
      PORT: String(PORT),
      DATABASE_URL: resolvedDbPath,
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || crypto.randomBytes(32).toString("hex"),
      BIOMETRIC_MASTER_KEY: process.env.BIOMETRIC_MASTER_KEY || crypto.randomBytes(32).toString("hex"),
      TENANT_ENCRYPTION_MASTER_KEY: process.env.TENANT_ENCRYPTION_MASTER_KEY || crypto.randomBytes(32).toString("hex"),
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex"),
      JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
