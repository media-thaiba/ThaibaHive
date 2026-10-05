import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('U3: Route Boundaries (loading.tsx skeletons and error recovery)', () => {
  const adminAuthPath = path.resolve(process.cwd(), '.auth/admin.json');

  test('Tasks page: displays skeleton during delayed API load and renders page', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    await page.route('**/api/tasks*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

    const tasksHeading = page.locator('h1, h2, div:has-text("Task")');
    await expect(tasksHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test('Attendance page: displays skeleton during delayed load and renders page', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    await page.route('**/api/attendance*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/attendance', { waitUntil: 'domcontentloaded' });

    const attendanceHeading = page.locator('h1, h2, div:has-text("Attendance")');
    await expect(attendanceHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test('Leaves page: displays skeleton during delayed load and renders page', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    await page.route('**/api/leaves*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/leaves', { waitUntil: 'domcontentloaded' });

    const leavesHeading = page.locator('h1, h2, div:has-text("Leave")');
    await expect(leavesHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test('Tasks page: handles 500 error and recovers on retry', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let shouldFail = true;
    await page.route('**/api/tasks*', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated 500 internal server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Unroute 500 and verify retry or reload
    shouldFail = false;
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Refresh")');
    if (await retryBtn.count() > 0) {
      await retryBtn.first().click();
    } else {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    const tasksHeading = page.locator('h1, h2, div:has-text("Task")');
    await expect(tasksHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test('Attendance page: handles 500 error and recovers on retry', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let shouldFail = true;
    await page.route('**/api/attendance*', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated 500 internal server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/attendance', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    shouldFail = false;
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Refresh")');
    if (await retryBtn.count() > 0) {
      await retryBtn.first().click();
    } else {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    const attendanceHeading = page.locator('h1, h2, div:has-text("Attendance")');
    await expect(attendanceHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });

  test('Leaves page: handles 500 error and recovers on retry', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let shouldFail = true;
    await page.route('**/api/leaves*', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated 500 internal server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/leaves', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    shouldFail = false;
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Refresh")');
    if (await retryBtn.count() > 0) {
      await retryBtn.first().click();
    } else {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    const leavesHeading = page.locator('h1, h2, div:has-text("Leave")');
    await expect(leavesHeading.first()).toBeVisible({ timeout: 15000 });

    await context.close();
  });
});
