import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { tasks } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test.describe("Tasks Kanban Board", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Clean up any tasks left over from previous test runs to prevent duplicate match errors
    await db.delete(tasks).where(eq(tasks.title, "E2E Tasks Board Test")).run();
    console.log("Cleaned up tasks with title 'E2E Tasks Board Test' from database");

    // 2. Perform UI login as test-admin (who has tasks:create permission)
    await page.goto("/auth/login");
    await page.fill("#email", "test-admin@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL("/");
  });

  test("should allow creating a new task, showing it on Kanban, and viewing details", async ({ page }) => {
    await page.goto("/tasks");

    // Click New Task button
    const newBtn = page.locator("a:has-text('New Task')");
    await newBtn.click();
    await expect(page).toHaveURL("/tasks/new");

    // Fill form elements
    const form = page.locator("form");
    await form.locator("input").first().fill("E2E Tasks Board Test");
    await form.locator("textarea").first().fill("Description for E2E task board test");

    // Click Submit
    await form.locator("button[type='submit']").click();

    // Verify redirected back to tasks board and card appears
    await expect(page).toHaveURL("/tasks");
    const taskCard = page.locator("text=E2E Tasks Board Test");
    await expect(taskCard).toBeVisible();

    // Click on the task link to view details
    await page.locator("a:has-text('E2E Tasks Board Test')").click();

    // Verify redirected to details page (uses async matching to wait for navigation)
    await expect(page).toHaveURL(/\/tasks\/.+/);
    
    // Details page heading should show the task title
    const detailsHeading = page.locator("h1");
    await expect(detailsHeading).toContainText("E2E Tasks Board Test");
  });
});
