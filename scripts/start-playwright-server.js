// Server launcher for Playwright E2E testing
const path = require("path");

const PORT = process.env.PORT || 3000;
const resolvedDbPath = process.env.DATABASE_URL || `file:${path.resolve("dev.db").replace(/\\/g, "/")}`;

// Set all required production env variables for startup instrumentation check
process.env.PORT = String(PORT);
process.env.DATABASE_URL = resolvedDbPath;
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
process.env.NODE_ENV = "production";
process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${PORT}`;
process.env.APP_URL = `http://localhost:${PORT}`;
process.env.PLAYWRIGHT_TEST = "true";

// Require standalone server
require(path.resolve(__dirname, "../.next/standalone/server.js"));
