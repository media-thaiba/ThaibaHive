import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), ".auth");

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
export async function loginAndSaveState(page: Page, role: "super_admin" | "admin" | "principal" | "hod" | "staff"): Promise<string> {
  ensureAuthDir();
  const statePath = path.join(AUTH_DIR, `${role}.json`);

  let email = "test-staff@thaibahive.local";
  if (role === "super_admin") email = "test-superadmin@thaibahive.local";
  else if (role === "admin") email = "test-admin@thaibahive.local";
  else if (role === "principal") email = "test-principal@thaibahive.local";
  else if (role === "hod") email = "test-hod@thaibahive.local";

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
