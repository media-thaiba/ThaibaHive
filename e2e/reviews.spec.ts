import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { performanceReviews, staff } from "../packages/db/schema";
import { eq, like } from "drizzle-orm";

/**
 * Performance Reviews — REAL workflow specs (Round 2 / O6-R).
 *
 * Replaces the previous heading-only smoke specs with full user journeys:
 *   1. Staff: draft review → open Self-Evaluation dialog → verify + fill the form.
 *   2. Admin: create review (unique period) → star rating → complete review →
 *      UI + DB assertions.
 *   3. Admin portal: critical JS error guard.
 *
 * Known defects intentionally NOT asserted as happy paths (reported in audit):
 *   - Staff "Save Draft" / "Submit for Review" calls PATCH /api/reviews/:id which
 *     requires `reviews:update`; packages/auth/roles.ts grants that only to
 *     admin/principal/super_admin, so the owner of the review gets 403 even
 *     though the route has a dedicated staff-owner branch.
 *   - HOD has the same gap (no `reviews:update`) despite an isHod branch.
 */

const STAFF_EMAIL = "test-staff@thaibahive.local";
const STAFF_PERIOD = "E2E Staff Self-Eval";
const ADMIN_PERIOD_PREFIX = "E2E Admin Cycle";

test.describe("Performance Reviews — Staff self-evaluation workflow", () => {
  test.use({ storageState: ".auth/staff.json" });

  test.beforeEach(async () => {
    await db
      .delete(performanceReviews)
      .where(eq(performanceReviews.period, STAFF_PERIOD))
      .run();

    const staffRow = await db
      .select()
      .from(staff)
      .where(eq(staff.email, STAFF_EMAIL))
      .get();
    expect(staffRow, "e2e staff user must exist (global-setup)").toBeTruthy();

    await db
      .insert(performanceReviews)
      .values({
        id: "e2e_staff_self_eval",
        institutionId: "inst_campus_main",
        staffId: staffRow!.id,
        period: STAFF_PERIOD,
        status: "draft",
      })
      .run();
  });

  test("renders list row for the draft and opens the self-evaluation form", async ({ page }) => {
    await page.goto("/reviews");

    await expect(page.getByRole("heading", { name: "My Performance Reviews" })).toBeVisible();

    const row = page
      .locator(`span:text-is("${STAFF_PERIOD}")`)
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl") and contains(@class,"border")][1]');
    await expect(row).toBeVisible();
    await expect(row.getByText("Self-Evaluation Pending")).toBeVisible();

    await row.locator('button:has-text("Self-Evaluate")').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Self-Evaluation" })).toBeVisible();

    const achievements = dialog.locator(
      'textarea[placeholder="Describe your key accomplishments, completed goals, and contributions..."]'
    );
    const improvements = dialog.locator(
      'textarea[placeholder="Describe skills to develop, challenges faced, and areas where you\'d like support..."]'
    );
    await expect(achievements).toBeVisible();
    await expect(improvements).toBeVisible();

    await achievements.fill("Shipped the E2E review workflow fixtures");
    await improvements.fill("Extend coverage to HOD completion path");

    // Save/submit buttons are rendered for draft reviews (their PATCH is blocked
    // by the documented reviews:update RBAC gap — see header comment).
    await expect(dialog.locator('button:has-text("Save Draft")')).toBeVisible();
    await expect(dialog.locator('button:has-text("Submit for Review")')).toBeVisible();
    await expect(dialog.locator('button:has-text("Cancel")')).toBeVisible();
  });
});

test.describe("Performance Reviews — Admin create & complete workflow", () => {
  test.use({ storageState: ".auth/admin.json" });

  test.beforeEach(async () => {
    await db
      .delete(performanceReviews)
      .where(like(performanceReviews.period, `${ADMIN_PERIOD_PREFIX}%`))
      .run();
  });

  test("creates a review, rates it with stars and completes it", async ({ page }) => {
    const period = `${ADMIN_PERIOD_PREFIX} ${Date.now()}`;

    await page.goto("/admin/reviews");
    await expect(page.getByRole("heading", { name: "Performance Reviews" })).toBeVisible();

    await page.getByRole("button", { name: "New Review" }).first().click();

    const createDialog = page.getByRole("dialog");
    await expect(
      createDialog.getByRole("heading", { name: "Create Performance Review" })
    ).toBeVisible();

    await createDialog.locator("select").selectOption({ index: 1 });
    await createDialog.locator('input[placeholder="e.g. Q1 2026, H1 2026"]').fill(period);
    await createDialog
      .locator("textarea")
      .fill("Ship E2E review workflow\nKeep the authz matrix green");
    await createDialog.getByRole("button", { name: "Create Review" }).click();

    await expect(page.locator("text=Performance review created")).toBeVisible();

    const row = page
      .locator(`span:text-is("Period: ${period}")`)
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl") and contains(@class,"border")][1]');
    await expect(row).toBeVisible();
    await expect(row.getByText("Draft")).toBeVisible();

    await row.locator('button:has-text("View")').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Performance Review" })).toBeVisible();
    await expect(dialog.getByText("Ship E2E review workflow")).toBeVisible();

    // Manager review: pick 4 stars, add comments, complete.
    const stars = dialog.locator("button:has(svg.lucide-star)");
    await expect(stars).toHaveCount(5);
    await stars.nth(3).click();

    await dialog
      .locator('textarea[placeholder="Provide feedback on performance..."]')
      .fill("Solid quarter — verified by E2E.");

    await dialog.getByRole("button", { name: "Complete Review" }).click();
    await expect(page.locator("text=Review completed")).toBeVisible();

    const updatedRow = page
      .locator(`span:text-is("Period: ${period}")`)
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl") and contains(@class,"border")][1]');
    await expect(updatedRow.getByText("Completed")).toBeVisible();
    await expect(updatedRow.getByText("4/5")).toBeVisible();

    const saved = await db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.period, period))
      .get();
    expect(saved?.status).toBe("completed");
    expect(saved?.rating).toBe(4);
    expect(saved?.managerComments).toBe("Solid quarter — verified by E2E.");
    expect(saved?.goals).toContain("Ship E2E review workflow");
  });

  test("admin reviews portal renders with no critical JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/admin/reviews", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Performance Reviews" })).toBeVisible({
      timeout: 15000,
    });

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });
});
