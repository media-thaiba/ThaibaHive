import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { attendanceLogs, staff } from "../packages/db/schema";
import { eq, and } from "drizzle-orm";

test.describe("Attendance Scanner Workflows", () => {
  test.beforeEach(async ({ page }) => {
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

    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL("/");
  });

  test("should show check-in panel when not checked in", async ({ page }) => {
    await page.goto("/attendance");

    const checkInPanel = page.locator("text=Check In").first();
    await expect(checkInPanel).toBeVisible();
    await expect(page.locator("text=QR Code").first()).toBeVisible();
    await expect(page.locator("text=NFC Card").first()).toBeVisible();
    await expect(page.locator("text=Not checked in")).toBeVisible();
  });

  test("should open QR scanner modal when QR Code button is clicked", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=QR Code Check-In")).toBeVisible();
    await expect(modal.locator("text=Point your camera at the QR code")).toBeVisible();
  });

  test("should open NFC scanner modal when NFC Card button is clicked", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=NFC Check-In")).toBeVisible();
    await expect(modal.locator("text=Hold your NFC card")).toBeVisible();
  });

  test("should show NFC dev simulator with personal card button", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Dev: Simulate NFC Scan")).toBeVisible();
    await expect(modal.locator("button:has-text('Tap Personal NFC Card')")).toBeVisible();
  });

  test("should check in via NFC dev simulator personal card", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('NFC Card')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible();

    await modal.locator("button:has-text('Tap Personal NFC Card')").click();

    const toastSuccess = page.locator("text=Checked in successfully!");
    await expect(toastSuccess).toBeVisible({ timeout: 10000 });

    await expect(page.locator("text=Check Out")).toBeVisible();
    await expect(page.locator("text=Not checked in")).not.toBeVisible();
  });

  test("should show QR scanner manual input in dev mode", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();

    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible();

    const manualInput = modal.locator("input[placeholder*='Paste base64url']");
    await expect(manualInput).toBeVisible();
  });

  test("should close scanner modals with close button", async ({ page }) => {
    await page.goto("/attendance");

    await page.locator("button:has-text('QR Code')").first().click();
    const qrModal = page.locator("[data-slot='dialog-content']");
    await expect(qrModal).toBeVisible();

    await qrModal.locator("[data-slot='dialog-close']").first().click();
    await expect(qrModal).not.toBeVisible();

    await page.locator("button:has-text('NFC Card')").first().click();
    const nfcModal = page.locator("[data-slot='dialog-content']");
    await expect(nfcModal).toBeVisible();

    await nfcModal.locator("[data-slot='dialog-close']").first().click();
    await expect(nfcModal).not.toBeVisible();
  });

  test("should hide check-in panel after successful check-in", async ({ page }) => {
    await page.goto("/attendance");

    await expect(page.locator("text=Not checked in")).toBeVisible();

    await page.locator("button:has-text('NFC Card')").first().click();
    const modal = page.locator("[data-slot='dialog-content']");
    await modal.locator("button:has-text('Tap Personal NFC Card')").click();

    await expect(page.locator("text=Checked in successfully!")).toBeVisible({ timeout: 10000 });

    await expect(page.locator("text=Not checked in")).not.toBeVisible();
    await expect(page.locator("button:has-text('Check Out')")).toBeVisible();
  });
});
