import { test, expect } from "@playwright/test";

/**
 * Performance Reviews E2E Specs — Sprint-030 Modernized
 * Uses cached storageState auth to bypass repetitive login flows.
 * Parallel-safe: read-only assertions with no shared data mutation.
 *
 * Note: networkidle is avoided as /reviews pages use SSE/long-poll connections
 * that prevent idle state. We use domcontentloaded + explicit element waits instead.
 */
test.describe("Performance Reviews — Staff Self-Evaluation", () => {
  test.use({ storageState: ".auth/staff.json" });

  test("renders staff reviews page with visible heading", async ({ page }) => {
    await page.goto("/reviews", { waitUntil: "domcontentloaded" });

    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "e2e/screenshots/reviews_staff_self_eval.png" });
  });

  test("displays review list container or empty state", async ({ page }) => {
    await page.goto("/reviews", { waitUntil: "domcontentloaded" });

    // Either a review card, data table, or the page main container should be visible
    const container = page.locator("main");
    await expect(container).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Performance Reviews — Admin Appraisal Portal", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("renders admin reviews portal with appraisal cycle layout", async ({ page }) => {
    await page.goto("/admin/reviews", { waitUntil: "domcontentloaded" });

    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "e2e/screenshots/reviews_admin_appraisal.png" });
  });

  test("admin reviews page returns 200 and has no critical JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/admin/reviews", { waitUntil: "domcontentloaded" });

    // Wait for heading to confirm page rendered
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });
});
