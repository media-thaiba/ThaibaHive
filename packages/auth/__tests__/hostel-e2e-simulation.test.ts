/**
 * @jest-environment node
 *
 * TPSH Hostel ERP — Comprehensive End-to-End Autonomous Simulation Suite
 * Runs the 12-Stage Dual-Dialect Verification Harness across SQLite & PostgreSQL
 */

import { describe, it, expect } from "@jest/globals";
import path from "path";
import { execSync } from "child_process";

describe("TPSH Hostel ERP — Autonomous End-to-End Simulation Suite", () => {
  it("executes all 12 stages of the hostel simulation harness with 100% success", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts", "hostel-simulate.ts");
    const output = execSync(`npx tsx "${scriptPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "simulate-test-auth-jwt-secret-minimum-32-chars",
        AUDIT_SIGNING_KEY: process.env.AUDIT_SIGNING_KEY || "simulate-test-audit-signing-key-minimum-32-chars",
      },
    });

    expect(output).toContain("SIMULATION COMPLETE: 12/12 STAGES PASSED (100% SUCCESS)");
    expect(output).toContain("PostgreSQL RLS strict cross-tenant barrier confirmed.");
  }, 45000);
});
