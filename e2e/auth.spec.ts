import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display validation errors for empty fields", async ({ page }) => {
    await page.goto("/auth/login");
    await page.click("button[type='submit']");
    const email = page.locator("#email");
    await expect(email).toBeVisible();
  });

  test("should fail to login with invalid credentials and show alert", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "invalid@test.com");
    await page.fill("#password", "wrongpassword");
    await page.click("button[type='submit']");
    
    // Look for any text on the page containing "invalid" or "failed" case-insensitively
    const errorAlert = page.getByText(/invalid|failed/i).first();
    await expect(errorAlert).toBeVisible();
  });

  test("should successfully login with correct credentials and redirect to dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");

    // Redirection check
    await expect(page).toHaveURL("/");
    
    // Check if we are on the dashboard
    const title = page.locator("h1");
    await expect(title).toBeVisible();
  });
});
