import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { attendanceLogs, staff } from "../packages/db/schema";
import { eq, and } from "drizzle-orm";

test.describe("Attendance Page", () => {
  // Run tests in serial mode to prevent database conflicts on the same test user
  test.describe.configure({ mode: "serial" });

  // Use the cached staff state directly to bypass UI login overhead
  test.use({ storageState: ".auth/staff.json" });

  test.beforeEach(async () => {
    // Delete today's log for test-staff to ensure simulated check-in always returns 201 Created
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
    await expect(checkOutBtn).toBeVisible({ timeout: 15000 });
    await checkOutBtn.click();

    const toastSuccess = page.locator("text=Checked out successfully!");
    await expect(toastSuccess).toBeVisible({ timeout: 15000 });
  });
});
