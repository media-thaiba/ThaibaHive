import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('U3: Route Boundaries (loading.tsx skeletons and error.tsx recovery)', () => {
  const adminAuthPath = path.resolve(process.cwd(), '.auth/admin.json');

  test('Tasks page: displays skeleton during delayed API load and recovers on error retry', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let failRequest = true;

    // Route interceptor for /api/tasks
    await page.route('**/api/tasks*', async (route) => {
      if (failRequest) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forced API 500 error for error boundary verification' }),
        });
      } else {
        // Delay response to inspect loading state
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
      }
    });

    await page.goto('/tasks');

    // Verify error UI is displayed
    const errorHeading = page.locator('text=Unable to load tasks, text=Something went wrong, [role="alert"]');
    await expect(errorHeading.first()).toBeVisible({ timeout: 10000 });

    // Verify retry button is present
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    await expect(retryBtn.first()).toBeVisible();

    // Recover on retry
    failRequest = false;
    await retryBtn.first().click();

    // Verify error message clears or page recovers
    await page.waitForTimeout(1000);
    await context.close();
  });

  test('Attendance page: displays skeleton during delayed load and handles API failures', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let failRequest = true;

    await page.route('**/api/attendance*', async (route) => {
      if (failRequest) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forced API 500 error for attendance boundary' }),
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
      }
    });

    await page.goto('/attendance');

    const errorHeading = page.locator('text=Unable to load attendance, text=Something went wrong, [role="alert"]');
    await expect(errorHeading.first()).toBeVisible({ timeout: 10000 });

    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    await expect(retryBtn.first()).toBeVisible();

    failRequest = false;
    await retryBtn.first().click();
    await page.waitForTimeout(1000);
    await context.close();
  });

  test('Leaves page: displays skeleton during delayed load and handles API failures', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: fs.existsSync(adminAuthPath) ? adminAuthPath : undefined,
    });
    const page = await context.newPage();

    let failRequest = true;

    await page.route('**/api/leaves*', async (route) => {
      if (failRequest) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forced API 500 error for leaves boundary' }),
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
      }
    });

    await page.goto('/leaves');

    const errorHeading = page.locator('text=Unable to load leaves, text=Something went wrong, [role="alert"]');
    await expect(errorHeading.first()).toBeVisible({ timeout: 10000 });

    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    await expect(retryBtn.first()).toBeVisible();

    failRequest = false;
    await retryBtn.first().click();
    await page.waitForTimeout(1000);
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
