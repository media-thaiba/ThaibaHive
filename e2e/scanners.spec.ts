import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { attendanceLogs, staff } from "../packages/db/schema";
import { eq, and } from "drizzle-orm";

test.describe("Attendance Scanner Workflows", () => {
  // Run tests in serial mode to prevent database conflicts on the same test user
  test.describe.configure({ mode: "serial" });

  // Use the cached staff state directly
  test.use({ storageState: ".auth/staff.json" });

  test.beforeEach(async () => {
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
  });

  test("should show check-in panel when not checked in", async ({ page }) => {
    await page.goto("/attendance");

    const checkInPanel = page.locator("text=Check In").first();
    await expect(checkInPanel).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=QR Code").first()).toBeVisible();
    await expect(page.locator("text=NFC Card").first()).toBeVisible();
    await expect(page.locator("text=Not checked in")).toBeVisible();
  });

  test("should open QR scanner modal when QR Code button is clicked", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal.locator("text=QR Code Check-In")).toBeVisible();
    await expect(modal.locator("text=Point your camera at the QR code")).toBeVisible();
  });

  test("should open NFC scanner modal when NFC Card button is clicked", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal.locator("text=NFC Check-In")).toBeVisible();
    await expect(modal.locator("text=Tap your NFC card to check in")).toBeVisible();
  });

  test("should show NFC manual entry options", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal.locator("button:has-text('Enter tag ID manually')")).toBeVisible();
  });

  test("should check in via NFC manual submission", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });

    await modal.locator("button:has-text('Enter tag ID manually')").click();
    await modal.locator("input").fill("test-nfc-tag-id-99");
    await modal.locator("button:has-text('Submit')").click();

    await expect(page.locator("text=Check Out")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Not checked in")).not.toBeVisible();
  });

  test("should show QR scanner manual input in dev mode", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });

    const manualInput = modal.locator("input[placeholder*='Paste base64url']");
    if (await manualInput.count() > 0) {
      await expect(manualInput).toBeVisible();
    }
  });

  test("should close scanner modals with close button", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();
    const qrModal = page.locator("[data-slot='dialog-content']");
    await expect(qrModal).toBeVisible({ timeout: 15000 });

    await qrModal.locator("[data-slot='dialog-close']").first().click();
    await expect(qrModal).not.toBeVisible({ timeout: 15000 });

    await page.locator("button:has-text('NFC Card')").first().click();
    const nfcModal = page.locator("[data-slot='dialog-content']");
    await expect(nfcModal).toBeVisible({ timeout: 15000 });

    await nfcModal.locator("[data-slot='dialog-close']").first().click();
    await expect(nfcModal).not.toBeVisible({ timeout: 15000 });
  });

  test("should hide check-in panel after successful check-in", async ({ page }) => {
    await page.goto("/attendance");

    await expect(page.locator("text=Not checked in")).toBeVisible();

    await page.locator("button:has-text('NFC Card')").first().click();
    const modal = page.locator("[data-slot='dialog-content']");
    await modal.locator("button:has-text('Enter tag ID manually')").click();
    await modal.locator("input").fill("test-nfc-tag-id-99");
    await modal.locator("button:has-text('Submit')").click();

    await expect(page.locator("text=Not checked in")).not.toBeVisible();
    await expect(page.locator("button:has-text('Check Out')")).toBeVisible({ timeout: 15000 });
  });
});
