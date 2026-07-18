import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { leaveRequests } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test.describe("Leaves Page", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Clean up any leaves left over from previous test runs to prevent duplicate match errors
    await db.delete(leaveRequests).where(eq(leaveRequests.reason, "E2E Test Leave")).run();
    console.log("Cleaned up leave requests with reason 'E2E Test Leave' from database");

    // 2. Perform UI login
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL("/");
  });

  test("should allow applying for leaves and verify request in history", async ({ page }) => {
    await page.goto("/leaves");

    // Click the first Apply Leave button to reveal form (resolves strict mode violation with EmptyState action)
    const applyBtn = page.locator("button:has-text('Apply Leave')").first();
    await applyBtn.click();

    // Fill form elements
    const form = page.locator("form");
    await form.locator("input[type='date']").nth(0).fill("2026-08-01");
    await form.locator("input[type='date']").nth(1).fill("2026-08-03");
    await form.locator("textarea[placeholder='Reason for leave']").fill("E2E Test Leave");


    // Click Submit
    const submitBtn = form.locator("button[type='submit']");
    await submitBtn.click();

    // Verify success toast
    const successToast = page.locator("text=Leave application submitted successfully");
    await expect(successToast).toBeVisible();

    // Verify card in My Leave History
    const historyCard = page.locator("text=My Leave History");
    await expect(historyCard).toBeVisible();

    const leaveRequest = page.locator("text=E2E Test Leave");
    await expect(leaveRequest).toBeVisible();
  });
});
