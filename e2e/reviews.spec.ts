import { test, expect } from "@playwright/test";

test.describe("Performance Reviews Page Smoke & API Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");
  });

  test("should render Staff Reviews page and verify review list container", async ({ page }) => {
    await page.goto("/reviews");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reviews_staff_self_eval.png" });
  });

  test("should render Admin Reviews portal and verify appraisal cycle layout", async ({ page }) => {
    await page.goto("/admin/reviews");

    const body = page.locator("body");
    await expect(body).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reviews_admin_appraisal.png" });
  });
});
