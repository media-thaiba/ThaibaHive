import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), ".auth");

type E2ERole = "super_admin" | "admin" | "principal" | "hod" | "staff" | "accounts" | "purchase";

const ROLE_EMAILS: Record<E2ERole, string> = {
  super_admin: "test-superadmin@thaibahive.local",
  admin: "test-admin@thaibahive.local",
  principal: "test-principal@thaibahive.local",
  hod: "test-hod@thaibahive.local",
  staff: "test-staff@thaibahive.local",
  accounts: "test-accounts@thaibahive.local",
  purchase: "test-purchase@thaibahive.local",
};

const ROLE_EMPLOYEE_IDS: Record<E2ERole, string> = {
  super_admin: "TEST-SUPERADMIN-99",
  admin: "TEST-ADMIN-99",
  principal: "TEST-PRIN-99",
  hod: "TEST-HOD-99",
  staff: "TEST-STAFF-99",
  accounts: "TEST-ACCOUNTS-99",
  purchase: "TEST-PURCHASE-99",
};

/**
 * Ensures that the authentication state directory exists.
 */
function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

/**
 * Performs login for a given role and saves the browser storage state to a file.
 * Returns the path to the saved storage state file.
 */
export async function loginAndSaveState(page: Page, role: E2ERole): Promise<string> {
  ensureAuthDir();
  const statePath = path.join(AUTH_DIR, `${role}.json`);

  const email = ROLE_EMAILS[role];
  const password = "Password123";

  await page.goto("/auth/login");
  await page.waitForSelector("form[data-hydrated='true']", { timeout: 45000 });
  await page.waitForSelector("#email");

  // Fill credentials with delay for WebKit compatibility
  await page.fill("#email", "");
  await page.type("#email", email, { delay: 10 });
  await page.fill("#password", "");
  await page.type("#password", password, { delay: 10 });

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/" || url.pathname.includes("/dashboard") || !url.pathname.includes("/login")),
    page.click("button[type='submit']"),
  ]);

  // Save storage state (cookies, local storage, etc.)
  await page.context().storageState({ path: statePath });
  console.log(`Saved auth state for ${role} to ${statePath}`);

  return statePath;
}

export function getAuthStatePath(role: E2ERole): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export function getRoleEmail(role: E2ERole): string {
  return ROLE_EMAILS[role];
}

export function getRoleEmployeeId(role: E2ERole): string {
  return ROLE_EMPLOYEE_IDS[role];
}

export const E2E_ROLES: E2ERole[] = ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"];

export const ADMIN_ROLES: E2ERole[] = ["super_admin", "admin"];
export const PRINCIPAL_AND_ABOVE: E2ERole[] = ["super_admin", "admin", "principal"];
export const HOD_AND_ABOVE: E2ERole[] = ["super_admin", "admin", "principal", "hod"];
export const FINANCE_ROLES: E2ERole[] = ["super_admin", "admin", "principal", "hod", "accounts"];
export const PURCHASE_ROLES: E2ERole[] = ["super_admin", "admin", "principal", "hod", "purchase"];
export const ALL_STAFF_ROLES: E2ERole[] = ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"];

/**
 * Returns list of E2E roles that have cached auth state files.
 */
export function getAvailableRoles(): E2ERole[] {
  return E2E_ROLES.filter(r => authStateExists(r));
}

function authStateExists(role: string): boolean {
  return fs.existsSync(path.join(AUTH_DIR, `${role}.json`));
}
