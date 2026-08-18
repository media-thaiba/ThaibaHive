import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { attendanceLogs, staff } from "../packages/db/schema";
import { eq, and } from "drizzle-orm";

test.describe("Attendance Check-In & Verification Workflow", () => {
  test.describe.configure({ mode: "serial" });

  test("staff check-in is logged and verified by principal in team overview", async ({ page, browser }) => {
    // 1. Clean up today's logs for test-staff
    const user = await db
      .select()
      .from(staff)
      .where(eq(staff.email, "test-staff@thaibahive.local"))
      .get();
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      await db
        .delete(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.staffId, user.id),
            eq(attendanceLogs.date, today)
          )
        )
        .run();
    }

    // 2. Log in as staff and check-in via NFC manual entry
    const staffContext = await browser.newContext({ storageState: ".auth/staff.json" });
    const staffPage = await staffContext.newPage();
    await staffPage.goto("/attendance");

    await staffPage.locator("button:has-text('NFC Card')").first().click();
    const modal = staffPage.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });

    await modal.locator("button:has-text('Enter tag ID manually')").click();
    await modal.locator("input").fill("test-nfc-tag-id-99");
    await modal.locator("button:has-text('Submit')").click();

    // Verify staff page shows checked in / Check Out button
    await expect(staffPage.locator("text=Check Out")).toBeVisible({ timeout: 15000 });
    await staffContext.close();

    // 3. Log in as principal and verify in Team Overview tab
    const principalContext = await browser.newContext({ storageState: ".auth/principal.json" });
    const principalPage = await principalContext.newPage();
    await principalPage.goto("/attendance");

    // Click Team Overview tab
    const teamTab = principalPage.locator("button:has-text('Team Overview')");
    await expect(teamTab).toBeVisible({ timeout: 15000 });
    await teamTab.click();

    // Search for "TEST-STAFF-99" to verify search filtering works
    const searchInput = principalPage.locator("input[placeholder*='Search by name']");
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.click();
    await searchInput.pressSequentially("TEST-STAFF-99", { delay: 100 });

    // Verify "Test Staff" row appears in team logs list (auto-retries while React debounces filter)
    const staffRow = principalPage.locator("tr, div").filter({ hasText: "Test Staff" }).first();
    await expect(staffRow).toBeVisible({ timeout: 15000 });
    await principalContext.close();
  });
});
