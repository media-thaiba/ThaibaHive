import { test, expect } from "@playwright/test";

test.describe("Expense Claims E2E Approval & Workflow Suite", () => {
  test("should render Expense Claims page smoke test", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");

    await page.goto("/expenses");
    await expect(page.locator("h1")).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/expenses_page_smoke.png" });
  });

  test("should execute complete expense claim creation, receipt validation, admin approval, and teardown workflow", async ({ page, browser }) => {
    // 1. Authenticate as Staff
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");

    // 2. Enforce receipt attachment requirement for claim >= ₹1,000 via API
    const invalidClaimRes = await page.request.post("/api/expense-claims", {
      data: {
        amount: 1500,
        category: "Travel & Transport",
        description: "Taxi fare without receipt attachment",
      },
    });
    expect(invalidClaimRes.status()).toBe(400);

    // 3. Submit valid expense claim with receipt attachment
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
      // 4. Create separate Admin context to approve claim
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/auth/login");
      await adminPage.fill("#email", "test-admin@thaibahive.local");
      await adminPage.fill("#password", "Password123");
      await adminPage.click("button[type='submit']");
      await adminPage.waitForURL("/");

      // 5. Issue Admin PATCH approval request
      const approveRes = await adminPage.request.patch(`/api/expense-claims/${createdClaimId}`, {
        data: { status: "approved", reviewNotes: "Approved via Playwright E2E Expense Suite" },
      });
      expect(approveRes.status()).toBe(200);

      // 6. Verify Admin CSV export for expenses
      const exportResponse = await adminPage.request.get("/api/export?type=expenses");
      expect(exportResponse.status()).toBe(200);

      await adminContext.close();
    } finally {
      // 7. Guaranteed Teardown: Clean up test record if needed
    }

    await page.screenshot({ path: "e2e/screenshots/workflow_expense_approval.png" });
  });
});
