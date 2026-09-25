#!/usr/bin/env node
const { execSync } = require("child_process");

console.log("[build:analyze] Starting bundle analysis with ANALYZE=true...");

process.env.ANALYZE = "true";
process.env.NODE_ENV = "production";

try {
  // Execute next build with webpack for bundle analyzer compatibility
  execSync("npx next build --webpack", {
    stdio: "inherit",
    env: {
      ...process.env,
      ANALYZE: "true",
      NODE_ENV: "production",
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "build-analyze-secret-32-chars-minimum-placeholder",
      DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  });

  console.log("[build:analyze] Build and bundle analysis completed successfully.");
} catch (err) {
  console.error("[build:analyze] Build failed:", err.message);
  process.exit(1);
}
