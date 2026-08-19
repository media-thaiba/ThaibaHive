/**
 * @module ApiAuthValidator
 * Validates critical business API routes and RBAC authorization boundaries across 3 role tiers in staging.
 */

import { SignJWT } from "jose";
import type { ValidationResult } from "./health-db-validator";

export async function createTestToken(
  jwtSecret: string,
  role: "super_admin" | "admin" | "principal" | "hod" | "staff",
  staffId = "stf-staging-smoke-tester"
): Promise<string> {
  const secretKey = new TextEncoder().encode(jwtSecret);
  return new SignJWT({
    staffId,
    email: `${role}@staging.thaibahive.local`,
    role,
    employeeId: `EMP-${role.toUpperCase()}`,
    name: `Staging Smoke ${role}`,
    tokenVersion: 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);
}

export async function validateApisAndAuth(
  baseUrl: string,
  jwtSecret: string
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const superAdminToken = await createTestToken(jwtSecret, "super_admin", "34c45253-9416-4512-9fb6-179e257e346b");
  const principalToken = await createTestToken(jwtSecret, "principal", "prin-staging-001");
  const staffToken = await createTestToken(jwtSecret, "staff", "stf-staging-002");

  // 1. Nonce Endpoint Smoke Check
  const nonceStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/auth/mobile-handoff/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - nonceStart;
    results.push({
      suite: "Auth & APIs",
      name: "Mobile Handoff Nonce Endpoint",
      passed: res.status === 200,
      durationMs: dur,
      error: res.status !== 200 ? `Expected 200, got HTTP ${res.status}` : undefined,
    });
  } catch (err: any) {
    results.push({
      suite: "Auth & APIs",
      name: "Mobile Handoff Nonce Endpoint",
      passed: false,
      durationMs: Date.now() - nonceStart,
      error: err?.message || String(err),
    });
  }

  // 2. Auth Check-in & Session Validation (Principal Role Tier)
  const authMeStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/auth/permissions`, {
      headers: { Authorization: `Bearer ${principalToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - authMeStart;
    results.push({
      suite: "Auth & APIs",
      name: "Auth Session & Permissions Validation (Principal Tier)",
      passed: res.status === 200,
      durationMs: dur,
      error: res.status !== 200 ? `Expected 200, got HTTP ${res.status}` : undefined,
    });
  } catch (err: any) {
    results.push({
      suite: "Auth & APIs",
      name: "Auth Session & Permissions Validation (Principal Tier)",
      passed: false,
      durationMs: Date.now() - authMeStart,
      error: err?.message || String(err),
    });
  }

  // 3. Student Query Smoke Check (Super Admin Role Tier)
  const studentStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/students?limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - studentStart;
    results.push({
      suite: "Auth & APIs",
      name: "Student Roster Query (/api/students)",
      passed: res.status === 200,
      durationMs: dur,
      error: res.status !== 200 ? `Expected 200, got HTTP ${res.status}` : undefined,
    });
  } catch (err: any) {
    results.push({
      suite: "Auth & APIs",
      name: "Student Roster Query (/api/students)",
      passed: false,
      durationMs: Date.now() - studentStart,
      error: err?.message || String(err),
    });
  }

  // 4. Finance Ledger & Expense Claims Smoke Check (Super Admin Tier)
  const financeStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/expense-claims`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - financeStart;
    results.push({
      suite: "Auth & APIs",
      name: "Finance Expense Claims Route (/api/expense-claims)",
      passed: res.status === 200,
      durationMs: dur,
      error: res.status !== 200 ? `Expected 200, got HTTP ${res.status}` : undefined,
    });
  } catch (err: any) {
    results.push({
      suite: "Auth & APIs",
      name: "Finance Expense Claims Route (/api/expense-claims)",
      passed: false,
      durationMs: Date.now() - financeStart,
      error: err?.message || String(err),
    });
  }

  // 5. RBAC Boundary Enforcement (Staff Role Tier -> 403 on Admin Audit)
  const rbacStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - rbacStart;
    const rbacEnforced = res.status === 403 || res.status === 401;
    results.push({
      suite: "Auth & APIs",
      name: "RBAC Boundary Enforcement (Staff -> 403 on Admin Audit)",
      passed: rbacEnforced,
      durationMs: dur,
      error: !rbacEnforced ? `RBAC breach: Expected 403 Forbidden, got HTTP ${res.status}` : undefined,
    });
  } catch (err: any) {
    results.push({
      suite: "Auth & APIs",
      name: "RBAC Boundary Enforcement (Staff -> 403 on Admin Audit)",
      passed: false,
      durationMs: Date.now() - rbacStart,
      error: err?.message || String(err),
    });
  }

  return results;
}
