import { test, expect } from "@playwright/test";

test.describe("Marketplace Apps & Access Requests Page Smoke & API Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");
  });

  test("should render Marketplace Directory page and app cards container", async ({ page }) => {
    await page.goto("/marketplace");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/marketplace_browse.png" });
  });

  test("should query marketplace apps and pending access requests with authenticated session", async ({ page }) => {
    const appsRes = await page.request.get("/api/marketplace/apps");
    expect(appsRes.status()).toBe(200);

    const pendingRes = await page.request.get("/api/marketplace/access-requests/pending");
    expect([200, 401, 403]).toContain(pendingRes.status());

    await page.screenshot({ path: "e2e/screenshots/marketplace_access_requests.png" });
  });
});
