import { test, expect } from '@playwright/test';

test.describe('Admin Identity Radar', () => {
  test('should display radar dashboard', async ({ page }) => {
    await page.goto('/admin/security/identity');
    
    // Check loading state or final state
    await expect(page.locator('text=Identity Security Radar')).toBeVisible();
    await expect(page.locator('text=Session Distribution')).toBeVisible();
    await expect(page.locator('text=Revocation Velocity')).toBeVisible();
  });
});
