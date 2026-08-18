import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { leaveRequests, expenseClaims, purchaseRequests, leaveBalances, staff } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test.describe("Multi-Stage Approval Flows", () => {
  // Ensure approval tests execute serially to prevent database locks on SQLite
  test.describe.configure({ mode: "serial" });

  test.describe("Leave Approval Flow (Staff → HOD → Admin)", () => {
    test.use({ storageState: ".auth/staff.json" });

    test.beforeEach(async () => {
      // Clean up test data
      await db.delete(leaveRequests).where(eq(leaveRequests.reason, "E2E Leave Approval Test")).run();

      // Reset leave balances for test-staff to prevent Insufficient Balance errors
      const user = await db.select().from(staff).where(eq(staff.email, "test-staff@thaibahive.local")).get();
      if (user) {
        await db.update(leaveBalances).set({ usedDays: 0 }).where(eq(leaveBalances.staffId, user.id)).run();
        console.log("Reset leave balances for test-staff to 0 inside approvals suite");
      }
    });

    test("staff can apply for leave, HOD can approve, admin can final approve", async ({ page, browser }) => {
      // 1. Staff applies for leave
      await page.goto("/leaves");
      const applyBtn = page.locator("button:has-text('Apply Leave')").first();
      await applyBtn.click();

      const form = page.locator("form");
      await form.locator("input[type='date']").nth(0).fill("2026-09-01");
      await form.locator("input[type='date']").nth(1).fill("2026-09-03");
      await form.locator("textarea[placeholder='Reason for leave']").fill("E2E Leave Approval Test");

      const submitBtn = form.locator("button[type='submit']");
      await submitBtn.click();

      // Verify success toast
      const successToast = page.locator("text=Leave application submitted successfully");
      await expect(successToast).toBeVisible();

      // 2. Switch to HOD context and approve
      const hodContext = await browser.newContext({ storageState: ".auth/hod.json" });
      const hodPage = await hodContext.newPage();
      try {
        await hodPage.goto("/approvals");
        
        // Find the leave request and approve
        const leaveApproval = hodPage.locator("text=E2E Leave Approval Test").first();
        await expect(leaveApproval).toBeVisible();
        
        // Click approve button (HOD approval)
        const approveBtn = hodPage.locator("button:has-text('Approve')").first();
        await approveBtn.click();
        
        // Click Approve in the confirm dialog
        await hodPage.locator("[role='dialog'] button:has-text('Approve')").click();
        
        // Verify approval success
        const approvalSuccess = hodPage.locator("text=approved").first();
        await expect(approvalSuccess).toBeVisible();
      } finally {
        await hodContext.close();
      }

      // 3. Switch to Admin context and final approve
      const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
      const adminPage = await adminContext.newPage();
      try {
        await adminPage.goto("/approvals");
        
        // Find the leave request and final approve
        const adminApproval = adminPage.locator("text=E2E Leave Approval Test").first();
        await expect(adminApproval).toBeVisible();
        
        // Click approve button (Admin final approval)
        const finalApproveBtn = adminPage.locator("button:has-text('Approve')").first();
        await finalApproveBtn.click();
        
        // Click Approve in the confirm dialog
        await adminPage.locator("[role='dialog'] button:has-text('Approve')").click();
        
        // Verify final approval
        const finalApprovalSuccess = adminPage.locator("text=approved").first();
        await expect(finalApprovalSuccess).toBeVisible();
      } finally {
        await adminContext.close();
      }
    });
  });

  test.describe("Expense Claim Approval Flow", () => {
    test.use({ storageState: ".auth/staff.json" });

    test.beforeEach(async () => {
      // Clean up test data
      await db.delete(expenseClaims).where(eq(expenseClaims.description, "E2E Expense Approval Test")).run();
    });

    test("staff can submit expense claim, admin can approve", async ({ page, browser }) => {
      // 1. Staff submits expense claim
      await page.goto("/expenses");
      
      // Click Submit Claim button
      const addExpenseBtn = page.locator("button:has-text('Submit Claim')").first();
      await addExpenseBtn.click();

      // Fill form
      const form = page.locator("form");
      await form.locator("input").first().fill("150");
      await form.locator("select").first().selectOption("Travel & Transport");
      await form.locator("textarea").first().fill("E2E Expense Approval Test");

      // Submit
      const submitBtn = form.locator("button[type='submit']");
      await submitBtn.click({ force: true });

      // Verify success
      const successToast = page.locator("text=Expense claim submitted successfully");
      await expect(successToast).toBeVisible();

      // 2. Switch to Admin context and approve
      const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
      const adminPage = await adminContext.newPage();
      try {
        await adminPage.goto("/approvals");
        
        // Find the expense claim and approve
        const expenseApproval = adminPage.locator("text=E2E Expense Approval Test").first();
        await expect(expenseApproval).toBeVisible();
        
        // Click approve button
        const approveBtn = adminPage.locator("button:has-text('Approve')").first();
        await approveBtn.click();
        
        // Click Approve in the confirm dialog
        await adminPage.locator("[role='dialog'] button:has-text('Approve')").click();
        
        // Verify approval
        const approvalSuccess = adminPage.locator("text=approved").first();
        await expect(approvalSuccess).toBeVisible();
      } finally {
        await adminContext.close();
      }
    });
  });

  test.describe("Purchase Request Approval Flow (Staff → HOD → Accounts → Purchase)", () => {
    test.use({ storageState: ".auth/staff.json" });

    test.beforeEach(async () => {
      // Clean up test data
      await db.delete(purchaseRequests).where(eq(purchaseRequests.itemName, "E2E Purchase Approval Test")).run();
    });

    test("staff can submit purchase request, HOD approves, accounts approves, purchase approves", async ({ page, browser }) => {
      // Extend timeout for multi-stage approval (HOD + Accounts + Purchase = 3 DB writes)
      test.setTimeout(120000);
      // 1. Staff submits purchase request
      await page.goto("/purchases");
      
      // Click New Request button
      const newPurchaseBtn = page.locator("button:has-text('New Request')").first();
      await newPurchaseBtn.click();

      // Fill form
      const form = page.locator("form");
      await form.locator("input").first().fill("E2E Purchase Approval Test");
      await form.locator("input").nth(1).fill("2");
      await form.locator("input").nth(2).fill("500");
      await form.locator("textarea").first().fill("Test purchase for E2E approval flow");

      // Submit
      const submitBtn = form.locator("button[type='submit']");
      await submitBtn.click({ force: true });

      // Verify success
      const successToast = page.locator("text=Purchase request submitted successfully");
      await expect(successToast).toBeVisible();

      // 2. Switch to HOD context and approve
      const hodContext = await browser.newContext({ storageState: ".auth/hod.json" });
      const hodPage = await hodContext.newPage();
      try {
        await hodPage.goto("/approvals", { waitUntil: "domcontentloaded" });

        // Find the purchase request and approve
        const hodApproval = hodPage.locator("text=E2E Purchase Approval Test").first();
        await expect(hodApproval).toBeVisible({ timeout: 20000 });

        // Click approve button (HOD approval)
        const hodApproveBtn = hodPage.locator("button:has-text('Approve')").first();
        await hodApproveBtn.click();

        // Confirm in dialog
        const hodDialogBtn = hodPage.locator("[role='dialog'] button:has-text('Approve')");
        await expect(hodDialogBtn).toBeVisible({ timeout: 10000 });
        await hodDialogBtn.click();

        // Wait for dialog to close — confirms the HOD approval DB write committed
        await expect(hodDialogBtn).not.toBeAttached({ timeout: 10000 });
      } finally {
        await hodContext.close();
      }

      // 3. Switch to Admin context and approve (accounts approval)
      const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
      const adminPage = await adminContext.newPage();
      try {
        await adminPage.goto("/approvals", { waitUntil: "domcontentloaded" });

        // Find the purchase request (now in accounts-approval stage)
        const accountsApproval = adminPage.locator("text=E2E Purchase Approval Test").first();
        await expect(accountsApproval).toBeVisible({ timeout: 20000 });

        // Click approve button (accounts approval)
        const accountsApproveBtn = adminPage.locator("button:has-text('Approve')").first();
        await accountsApproveBtn.click();

        // Confirm in dialog
        const accountsDialogBtn = adminPage.locator("[role='dialog'] button:has-text('Approve')");
        await expect(accountsDialogBtn).toBeVisible({ timeout: 10000 });
        await accountsDialogBtn.click();

        // Wait for dialog to close — confirms the accounts approval DB write committed
        await expect(accountsDialogBtn).not.toBeAttached({ timeout: 10000 });
        // Navigate to final approval stage
        await adminPage.goto("/approvals", { waitUntil: "domcontentloaded" });

        // 4. Final approval (purchase-approved stage)
        const purchaseApproval = adminPage.locator("text=E2E Purchase Approval Test").first();
        await expect(purchaseApproval).toBeVisible({ timeout: 20000 });

        // Click approve button (final approval)
        const purchaseApproveBtn = adminPage.locator("button:has-text('Approve')").first();
        await purchaseApproveBtn.click();

        // Confirm in dialog
        const purchaseDialogBtn = adminPage.locator("[role='dialog'] button:has-text('Approve')");
        await expect(purchaseDialogBtn).toBeVisible({ timeout: 10000 });
        await purchaseDialogBtn.click();

        // Final confirmation — dialog button gone means approval submitted
        await expect(purchaseDialogBtn).not.toBeAttached({ timeout: 10000 });
      } finally {
        await adminContext.close();
      }
    });
  });
});
