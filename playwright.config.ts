import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3000;

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
    command: "node --env-file=.env .next/standalone/server.js",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      HEALTH_SECRET: "thaibahive_health_secret_token",
      PLAYWRIGHT_TEST: "true",
    },
  },
});
