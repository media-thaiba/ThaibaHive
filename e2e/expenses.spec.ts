import { test, expect } from "@playwright/test";

test.describe("Expense Claims E2E Approval & Workflow Suite", () => {
  // Use the cached staff state directly to bypass manual login for staff actions
  test.use({ storageState: ".auth/staff.json" });

  test("should render Expense Claims page smoke test", async ({ page }) => {
    await page.goto("/expenses");
    await expect(page.locator("h1, h2, [data-testid='page-header'], .animate-slide-up h1").first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "e2e/screenshots/expenses_page_smoke.png" });
  });

  test("should execute complete expense claim creation, receipt validation, admin approval, and teardown workflow", async ({ page, browser }) => {
    // 1. Enforce receipt attachment requirement for claim >= ₹1,000 via API
    const invalidClaimRes = await page.request.post("/api/expense-claims", {
      data: {
        amount: 1500,
        category: "Travel & Transport",
        description: "Taxi fare without receipt attachment",
      },
    });
    expect(invalidClaimRes.status()).toBe(400);

    // 2. Submit valid expense claim with receipt attachment
    const claimRes = await page.request.post("/api/expense-claims", {
      data: {
        amount: 1250.50,
        category: "Travel & Transport",
        description: "Inter-campus travel fuel & toll receipt",
        receiptUrl: "http://localhost:3000/uploads/test_receipt.pdf",
      },
    });
    expect(claimRes.status()).toBe(201);
    const claimData = await claimRes.json();
    const createdClaimId = claimData.claim?.id || claimData.id;
    expect(createdClaimId).toBeTruthy();

    try {
      // 3. Create separate Admin context loaded with cached admin storageState to approve claim
      const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
      const adminPage = await adminContext.newPage();
      
      // 4. Issue HOD Stage Transition PATCH request (pending -> pending_hod)
      const stage1Res = await adminPage.request.patch(`/api/expense-claims/${createdClaimId}`, {
        data: { status: "pending_hod", reviewNotes: "HOD Stage Approved" },
      });
      expect(stage1Res.status()).toBe(200);

      // 5. Issue Final Approval PATCH request (pending_hod -> approved)
      const stage2Res = await adminPage.request.patch(`/api/expense-claims/${createdClaimId}`, {
        data: { status: "approved", reviewNotes: "Approved via Playwright E2E Expense Suite" },
      });
      expect(stage2Res.status()).toBe(200);

      // 6. Verify Admin CSV export for expenses
      const exportResponse = await adminPage.request.get("/api/export?type=expenses");
      expect(exportResponse.status()).toBe(200);

      await adminContext.close();
    } finally {
      // Teardown is handled by database refreshes or test scope isolation
    }

    await page.screenshot({ path: "e2e/screenshots/workflow_expense_approval.png" });
  });
});
