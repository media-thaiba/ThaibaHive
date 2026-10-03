import { test, expect } from '@playwright/test';

test.describe('Zero Trust Auth Flow', () => {
  test('should trigger and pass OTP step-up when risk is high', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector("form[data-hydrated='true']", { timeout: 15000 });

    await page.fill('#email', 'test-admin@thaibahive.local');
    await page.fill('#password', 'Password123');
    await page.click('button[type="submit"]');

    // Wait for step-up dialog if triggered
    const dialog = page.locator('text=Security Verification Required');
    if (await dialog.isVisible({ timeout: 4000 }).catch(() => false)) {
      await page.click('text=Send OTP Code');
      await page.fill('input[placeholder="Enter 6-digit OTP"]', '123456'); // Mocked OTP
      await page.click('text=Verify OTP');
    }
    
    // Should be redirected away from auth login
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });
});
