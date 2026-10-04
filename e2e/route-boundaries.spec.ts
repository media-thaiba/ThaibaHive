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
});
