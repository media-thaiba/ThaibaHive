import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";

const PORT = process.env.PORT || 3000;
const envFlag = fs.existsSync(".env") ? "--env-file=.env " : "";

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
      HEALTH_SECRET: "thaibahive_health_secret_token",
      PLAYWRIGHT_TEST: "true",
      PORT: String(PORT),
      DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "a8f93c01948d374f638104829375b4f028471049281740192847192847192847",
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
