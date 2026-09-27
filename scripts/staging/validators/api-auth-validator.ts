/**
 * @module ApiAuthValidator
 * Validates critical business API routes and RBAC authorization boundaries across 3 role tiers in staging.
 */

import { SignJWT } from "jose";
import { db, staff } from "@thaiba/db";
import { eq, and } from "drizzle-orm";
import type { ValidationResult } from "./health-db-validator";

export async function getStaffForRole(role: string, fallbackId = "34c45253-9416-4512-9fb6-179e257e346b"): Promise<string> {
  try {
    const user = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.role, role), eq(staff.isActive, true)))
      .limit(1)
      .get();
    return user?.id || fallbackId;
  } catch {
    return fallbackId;
  }
}

export async function createTestToken(
  jwtSecret: string,
  role: "super_admin" | "admin" | "principal" | "hod" | "staff",
  staffId?: string
): Promise<string> {
  const resolvedStaffId = staffId || (await getStaffForRole(role));
  const secretKey = new TextEncoder().encode(jwtSecret);
  return new SignJWT({
    staffId: resolvedStaffId,
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

  const superAdminToken = await createTestToken(jwtSecret, "super_admin");
  const principalToken = await createTestToken(jwtSecret, "principal");
  const staffToken = await createTestToken(jwtSecret, "staff");

  // 1. Nonce Endpoint Smoke Check
  const nonceStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/auth/mobile-handoff/nonce`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`,
        Cookie: `thaibahive_session=${staffToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    const dur = Date.now() - nonceStart;
    const passed = res.status === 201 || res.status === 200;
    results.push({
      suite: "Auth & APIs",
      name: "Mobile Handoff Nonce Endpoint",
      passed,
      durationMs: dur,
      error: !passed ? `Expected 200/201, got HTTP ${res.status}` : undefined,
    });
  } catch (err: unknown) {
    results.push({
      suite: "Auth & APIs",
      name: "Mobile Handoff Nonce Endpoint",
      passed: false,
      durationMs: Date.now() - nonceStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Auth Check-in & Session Validation (Principal Role Tier)
  const authMeStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/auth/permissions`, {
      headers: {
        Authorization: `Bearer ${principalToken}`,
        Cookie: `thaibahive_session=${principalToken}`,
      },
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
  } catch (err: unknown) {
    results.push({
      suite: "Auth & APIs",
      name: "Auth Session & Permissions Validation (Principal Tier)",
      passed: false,
      durationMs: Date.now() - authMeStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Student Query Smoke Check (Super Admin Role Tier)
  const studentStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/students?limit=5`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        Cookie: `thaibahive_session=${superAdminToken}`,
      },
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
  } catch (err: unknown) {
    results.push({
      suite: "Auth & APIs",
      name: "Student Roster Query (/api/students)",
      passed: false,
      durationMs: Date.now() - studentStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 4. Finance Ledger & Expense Claims Smoke Check (Super Admin Tier)
  const financeStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/expense-claims`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        Cookie: `thaibahive_session=${superAdminToken}`,
      },
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
  } catch (err: unknown) {
    results.push({
      suite: "Auth & APIs",
      name: "Finance Expense Claims Route (/api/expense-claims)",
      passed: false,
      durationMs: Date.now() - financeStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5. RBAC Boundary Enforcement (Staff Role Tier -> 403 on Admin Audit)
  const rbacStart = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${staffToken}`,
        Cookie: `thaibahive_session=${staffToken}`,
      },
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
  } catch (err: unknown) {
    results.push({
      suite: "Auth & APIs",
      name: "RBAC Boundary Enforcement (Staff -> 403 on Admin Audit)",
      passed: false,
      durationMs: Date.now() - rbacStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}
