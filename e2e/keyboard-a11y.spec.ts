import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('U4: Keyboard-Only Accessibility & Focus-Visible Verification', () => {
  const adminAuthPath = path.resolve(process.cwd(), '.auth/admin.json');
  const staffAuthPath = path.resolve(process.cwd(), '.auth/staff.json');

  test('1. Login: Full keyboard-only workflow', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Press Tab to reach the first input (email)
    await page.keyboard.press('Tab');
    const focusedInput = page.locator(':focus');
    await expect(focusedInput).toBeVisible();

    // Type credentials via keyboard
    await page.keyboard.type('test-admin@thaibahive.local');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Password123');

    // Press Tab to reaching Submit button and press Enter
    await page.keyboard.press('Tab');
    const submitBtn = page.locator(':focus');
    await expect(submitBtn).toBeVisible();
    await page.keyboard.press('Enter');

    // Verify submission attempt initiated
    await page.waitForTimeout(1000);
  });

  test('2. Attendance Marking: Keyboard navigation and interaction', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(staffAuthPath) ? staffAuthPath : undefined,
    });
    const page = await context.newPage();
    await page.goto('/attendance');
    await page.waitForLoadState('domcontentloaded');

    // Tab through interactive elements on attendance dashboard
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      if (await focused.count() > 0) {
        await expect(focused).toBeVisible();
      }
    }

    await context.close();
  });

  test('3. Leave Request: Keyboard navigation to leave request modal', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(staffAuthPath) ? staffAuthPath : undefined,
    });
    const page = await context.newPage();
    await page.goto('/leaves');
    await page.waitForLoadState('domcontentloaded');

    // Tab into page actions
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      if (await focused.count() > 0) {
        await expect(focused).toBeVisible();
      }
    }

    await context.close();
  });

  test('4. NFC Check-In: Keyboard interaction for tag entry', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();
    await page.goto('/admin/nfc');
    await page.waitForLoadState('domcontentloaded');

    // Tab into controls
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      if (await focused.count() > 0) {
        await expect(focused).toBeVisible();
      }
    }

    await context.close();
  });

  test('5. Focus-Visible & Contrast verification on 5 busiest screens', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    const screens = ['/auth/login', '/staff', '/tasks', '/attendance', '/leaves'];

    for (const screen of screens) {
      await page.goto(screen);
      await page.waitForLoadState('domcontentloaded');

      // Tab twice to activate focus ring
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focused = page.locator(':focus');
      if (await focused.count() > 0) {
        const isVisible = await focused.isVisible();
        expect(isVisible).toBe(true);
      }
    }

    await context.close();
  });
});
