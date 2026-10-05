import { test, expect, type Page } from "@playwright/test";
import { db } from "../packages/db";
import {
  marketplaceApps,
  appDefaultRoles,
  userAppAssignments,
  accessRequests,
} from "../packages/db/schema";
import { eq } from "drizzle-orm";

/**
 * Marketplace — REAL workflow specs (Round 2 / O6-R).
 *
 * Replaces the previous heading-only smoke spec with actual user journeys:
 *   1. Install an instant app (button → toast → Installed badge → DB row).
 *   2. Request access to a restricted app (dialog → reason → pending DB row).
 *   3. Category tab filtering (All / Instant / Restricted).
 *
 * Data note: seed() early-returns on an existing institution, so
 * seedMarketplace() never ran on this DB (marketplace_apps was empty).
 * These tests therefore seed their own apps + default role in beforeEach and
 * clean assignments/requests first (install 409s on existing assignments,
 * access-requests 409s on pending duplicates).
 */

const INSTANT_APP_ID = "e2e_app_instant";
const RESTRICTED_APP_ID = "e2e_app_restricted";
const INSTANT_NAME = "E2E Instant App";
const RESTRICTED_NAME = "E2E Restricted App";

function appCard(page: Page, name: string) {
  return page
    .locator(`h3:text-is("${name}")`)
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl") and contains(@class,"border")][1]');
}

test.describe("Marketplace — install & access-request workflows", () => {
  test.use({ storageState: ".auth/staff.json" });

  test.beforeEach(async () => {
    for (const appId of [INSTANT_APP_ID, RESTRICTED_APP_ID]) {
      await db.delete(accessRequests).where(eq(accessRequests.appId, appId)).run();
      await db.delete(userAppAssignments).where(eq(userAppAssignments.appId, appId)).run();
      await db.delete(appDefaultRoles).where(eq(appDefaultRoles.appId, appId)).run();
      await db.delete(marketplaceApps).where(eq(marketplaceApps.id, appId)).run();
    }

    await db
      .insert(marketplaceApps)
      .values([
        {
          id: INSTANT_APP_ID,
          name: INSTANT_NAME,
          slug: "e2e-instant-app",
          description: "Instant app used by the E2E install workflow",
          icon: "Store",
          category: "instant",
        },
        {
          id: RESTRICTED_APP_ID,
          name: RESTRICTED_NAME,
          slug: "e2e-restricted-app",
          description: "Restricted app used by the E2E access-request workflow",
          icon: "Lock",
          category: "restricted",
        },
      ])
      .run();

    await db
      .insert(appDefaultRoles)
      .values({
        id: "e2e_role_instant_contributor",
        appId: INSTANT_APP_ID,
        roleName: "contributor",
        permissions: "[]",
        isDefault: true,
      })
      .run();
  });

  test("installs an instant app end-to-end", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: "App Marketplace" })).toBeVisible();

    const card = appCard(page, INSTANT_NAME);
    await expect(card).toBeVisible();
    await card.locator('button:has-text("Install")').click();

    await expect(page.getByText(`${INSTANT_NAME} installed`, { exact: true }).first()).toBeVisible();
    await expect(card.locator('button:has-text("Active")')).toBeVisible();
    await expect(card.getByText("Installed")).toBeVisible();

    const assignment = await db
      .select()
      .from(userAppAssignments)
      .where(eq(userAppAssignments.appId, INSTANT_APP_ID))
      .get();
    expect(assignment).toBeTruthy();
    expect(assignment?.status).toBe("active");
  });

  test("requests access to a restricted app via the dialog", async ({ page }) => {
    await page.goto("/marketplace");

    const card = appCard(page, RESTRICTED_NAME);
    await expect(card).toBeVisible();
    await expect(card.getByText("Restricted", { exact: true })).toBeVisible();
    await card.locator('button:has-text("Request Access")').click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: `Request Access to ${RESTRICTED_NAME}` })
    ).toBeVisible();

    const reason = dialog.locator("#reason");
    await reason.fill("E2E verification of the restricted access-request workflow");
    await dialog.getByRole("button", { name: "Submit Request" }).click();

    await expect(page.locator("text=Access request submitted")).toBeVisible();
    await expect(card.locator('button:has-text("Request Sent")')).toBeVisible();

    const request = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.appId, RESTRICTED_APP_ID))
      .get();
    expect(request?.status).toBe("pending");
    expect(request?.reason).toBe("E2E verification of the restricted access-request workflow");
  });

  test("filters apps by category tabs", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(appCard(page, INSTANT_NAME)).toBeVisible();
    await expect(appCard(page, RESTRICTED_NAME)).toBeVisible();

    await page.getByRole("button", { name: /^Instant/ }).click();
    await expect(appCard(page, INSTANT_NAME)).toBeVisible();
    await expect(appCard(page, RESTRICTED_NAME)).toHaveCount(0);

    await page.getByRole("button", { name: /^Restricted/ }).click();
    await expect(appCard(page, RESTRICTED_NAME)).toBeVisible();
    await expect(appCard(page, INSTANT_NAME)).toHaveCount(0);

    await page.getByRole("button", { name: /^All/ }).click();
    await expect(appCard(page, INSTANT_NAME)).toBeVisible();
    await expect(appCard(page, RESTRICTED_NAME)).toBeVisible();
  });
});
