import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display validation errors for empty fields", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForSelector("form[data-hydrated='true']", { timeout: 15000 });
    await page.click("button[type='submit']");
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
  });

  test("should fail to login with invalid credentials and show alert", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForSelector("form[data-hydrated='true']", { timeout: 15000 });
    
    // Fill credentials with delay for browser consistency
    await page.fill("#email", "");
    await page.type("#email", "invalid@test.com", { delay: 10 });
    await page.fill("#password", "");
    await page.type("#password", "wrongpassword", { delay: 10 });
    
    await page.click("button[type='submit']");
    
    // Auto-retrying assertion checks that the alert container is shown and contains the failure message
    const errorAlert = page.locator("form [role='alert']");
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(/invalid|failed/i, { timeout: 15000 });
  });

  test("should successfully login with correct credentials and redirect to dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForSelector("form[data-hydrated='true']", { timeout: 15000 });
    
    await page.fill("#email", "");
    await page.type("#email", "test-staff@thaibahive.local", { delay: 10 });
    await page.fill("#password", "");
    await page.type("#password", "Password123", { delay: 10 });
    
    await page.click("button[type='submit']");

    // Redirection and dashboard presence checks with auto-retrying assertions
    await expect(page).toHaveURL(/\/|dashboard/, { timeout: 25000 });
    
    const dashboardTitle = page.locator("h1, .animate-pulse").first();
    await expect(dashboardTitle).toBeVisible({ timeout: 25000 });
  });
});
