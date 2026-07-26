import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { leaveRequests, expenseClaims, purchaseRequests } from "../packages/db/schema";
import { eq } from "drizzle-orm";

test.describe("Multi-Stage Approval Flows", () => {
  test.describe("Leave Approval Flow (Staff → HOD → Admin)", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up test data
      await db.delete(leaveRequests).where(eq(leaveRequests.reason, "E2E Leave Approval Test")).run();
      
      // Login as staff
      await page.goto("/auth/login");
      await page.fill("#email", "test-staff@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");
    });

    test("staff can apply for leave, HOD can approve, admin can final approve", async ({ page }) => {
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

      // 2. Login as HOD and approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-hod@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the leave request and approve
      const leaveApproval = page.locator("text=E2E Leave Approval Test").first();
      await expect(leaveApproval).toBeVisible();
      
      // Click approve button (HOD approval)
      const approveBtn = page.locator("button:has-text('Approve')").first();
      await approveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify approval success
      const approvalSuccess = page.locator("text=approved").first();
      await expect(approvalSuccess).toBeVisible();

      // 3. Login as Admin and final approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-admin@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the leave request and final approve
      const adminApproval = page.locator("text=E2E Leave Approval Test").first();
      await expect(adminApproval).toBeVisible();
      
      // Click approve button (Admin final approval)
      const finalApproveBtn = page.locator("button:has-text('Approve')").first();
      await finalApproveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify final approval
      const finalApprovalSuccess = page.locator("text=approved").first();
      await expect(finalApprovalSuccess).toBeVisible();
    });
  });

  test.describe("Expense Claim Approval Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up test data
      await db.delete(expenseClaims).where(eq(expenseClaims.description, "E2E Expense Approval Test")).run();
      
      // Login as staff
      await page.goto("/auth/login");
      await page.fill("#email", "test-staff@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");
    });

    test("staff can submit expense claim, admin can approve", async ({ page }) => {
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
      await submitBtn.click();

      // Verify success
      const successToast = page.locator("text=Expense claim submitted successfully");
      await expect(successToast).toBeVisible();

      // 2. Login as Admin and approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-admin@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the expense claim and approve
      const expenseApproval = page.locator("text=E2E Expense Approval Test").first();
      await expect(expenseApproval).toBeVisible();
      
      // Click approve button
      const approveBtn = page.locator("button:has-text('Approve')").first();
      await approveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify approval
      const approvalSuccess = page.locator("text=approved").first();
      await expect(approvalSuccess).toBeVisible();
    });
  });

  test.describe("Purchase Request Approval Flow (Staff → HOD → Accounts → Purchase)", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up test data
      await db.delete(purchaseRequests).where(eq(purchaseRequests.itemName, "E2E Purchase Approval Test")).run();
      
      // Login as staff
      await page.goto("/auth/login");
      await page.fill("#email", "test-staff@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");
    });

    test("staff can submit purchase request, HOD approves, accounts approves, purchase approves", async ({ page }) => {
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
      await submitBtn.click();

      // Verify success
      const successToast = page.locator("text=Purchase request submitted successfully");
      await expect(successToast).toBeVisible();

      // 2. Login as HOD and approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-hod@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the purchase request and approve
      const hodApproval = page.locator("text=E2E Purchase Approval Test").first();
      await expect(hodApproval).toBeVisible();
      
      // Click approve button (HOD approval)
      const hodApproveBtn = page.locator("button:has-text('Approve')").first();
      await hodApproveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify HOD approval
      const hodApprovalSuccess = page.locator("text=approved").first();
      await expect(hodApprovalSuccess).toBeVisible();

      // 3. Login as Admin (accounts) and approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-admin@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the purchase request and approve (accounts approval)
      const accountsApproval = page.locator("text=E2E Purchase Approval Test").first();
      await expect(accountsApproval).toBeVisible();
      
      // Click approve button (accounts approval)
      const accountsApproveBtn = page.locator("button:has-text('Approve')").first();
      await accountsApproveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify accounts approval
      const accountsApprovalSuccess = page.locator("text=approved").first();
      await expect(accountsApprovalSuccess).toBeVisible();

      // 4. Login as Admin (purchase) and final approve
      await page.goto("/auth/login");
      await page.fill("#email", "test-admin@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await expect(page).toHaveURL("/");

      // Go to approvals page
      await page.goto("/approvals");
      
      // Find the purchase request and final approve
      const purchaseApproval = page.locator("text=E2E Purchase Approval Test").first();
      await expect(purchaseApproval).toBeVisible();
      
      // Click approve button (purchase approval)
      const purchaseApproveBtn = page.locator("button:has-text('Approve')").first();
      await purchaseApproveBtn.click();
      
      // Click Approve in the confirm dialog
      await page.locator("[role='dialog'] button:has-text('Approve')").click();
      
      // Verify final approval
      const purchaseApprovalSuccess = page.locator("text=approved").first();
      await expect(purchaseApprovalSuccess).toBeVisible();
    });
  });
});
