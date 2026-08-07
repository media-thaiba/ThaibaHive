import { test, expect } from "@playwright/test";

test.describe("Finance Fee Invoices & Payment Receipts E2E", () => {
  // Use cached super_admin storageState directly to bypass billing boundaries
  test.use({ storageState: ".auth/super_admin.json" });

  test("allows recording tuition fee income transaction and exporting receipt ledger", async ({ page }) => {
    // 1. Navigate to Accounts Ledger page
    await page.goto("/accounts");
    await expect(page.locator("h1, h2, [data-testid='page-header']").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Institutional Financials").first()).toBeVisible({ timeout: 15000 });

    // 2. Click Record Transaction button to open Dialog
    await page.locator("button:has-text('Record Transaction')").click();
    const txModal = page.locator("[data-slot='dialog-content']");
    await expect(txModal).toBeVisible({ timeout: 15000 });

    // Fill form fields
    await txModal.locator("input[placeholder='0.00']").fill("25000");
    await txModal.locator("input[placeholder*='lab equipment']").fill("E2E Tuition Fee Receipt");
    await txModal.locator("textarea[placeholder*='audit notes']").fill("Cheque payment logged under ADM-1001 E2E");

    // Click Record Entry submit button
    await txModal.locator("button:has-text('Record Entry')").click();

    // Verify success toast
    const toastSuccess = page.locator("text=Transaction recorded successfully!");
    await expect(toastSuccess).toBeVisible({ timeout: 15000 });

    // Verify row appears in Ledger table
    const ledgerRow = page.locator("tr, div").filter({ hasText: "E2E Tuition Fee Receipt" }).first();
    await expect(ledgerRow).toBeVisible({ timeout: 15000 });

    // 3. Export financial ledger
    const exportBtn = page.locator("button:has-text('Export CSV')").first();
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    await exportBtn.click();

    // Export Dialog opens
    const exportModal = page.locator("[data-slot='dialog-content']");
    await expect(exportModal).toBeVisible({ timeout: 15000 });

    const downloadPromise = page.waitForEvent("download");
    // Trigger download via the "Export CSV" button in the footer of the export modal
    await exportModal.locator("button:has-text('Export CSV')").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("accounts");
  });
});
