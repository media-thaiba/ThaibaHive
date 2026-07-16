import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { attendanceLogs, staff } from "../packages/db/schema";
import { eq, and } from "drizzle-orm";

test.describe("Attendance Page", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Delete today's log for test-staff to ensure simulated check-in always returns 201 Created
    const user = await db.select().from(staff).where(eq(staff.email, "test-staff@thaibahive.local")).get();
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      await db.delete(attendanceLogs).where(
        and(
          eq(attendanceLogs.staffId, user.id),
          eq(attendanceLogs.date, today)
        )
      ).run();
      console.log(`Cleaned up attendance log for today (${today}) for test-staff`);
    }

    // 2. Perform UI login
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL("/");
  });

  test("should display attendance history and handle check out if checked in", async ({ page, context }) => {
    // 1. Trigger simulated check-in using request context with seeded NFC tag
    const checkInRes = await context.request.post("/api/attendance/check-in", {
      data: { method: "nfc", nfcTagId: "test-nfc-tag-id-99" }
    });
    console.log("Simulated check-in API response status:", checkInRes.status());
    expect(checkInRes.status()).toBe(201);

    // 2. Go to attendance page
    await page.goto("/attendance");

    // 3. Click Check Out and verify checkout toast
    const checkOutBtn = page.locator("button:has-text('Check Out')");
    await expect(checkOutBtn).toBeVisible();
    await checkOutBtn.click();

    const toastSuccess = page.locator("text=Checked out successfully!");
    await expect(toastSuccess).toBeVisible();
  });
});
