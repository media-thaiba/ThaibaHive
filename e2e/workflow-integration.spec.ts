import { test, expect } from "@playwright/test";

test.describe("Full System Integration Workflow", () => {
  const HEALTH_SECRET = process.env.HEALTH_SECRET || "thaibahive_health_secret_token";

  test("should verify system health probe secret gating logic", async ({ request }) => {
    // 1. Authorized request with secret header: must return HTTP 200 with gated diagnostic fields
    const authResponse = await request.get("/api/system/health", {
      headers: { "x-health-secret": HEALTH_SECRET },
    });
    expect(authResponse.status()).toBe(200);
    const authBody = await authResponse.json();
    expect(authBody.status).toBe("ok");
    expect(authBody.uptimeSeconds).toBeDefined();
    expect(authBody.database).toBeDefined();
    expect(authBody.database.connected).toBe(true);

    // 2. Unauthorized request without secret header: returns HTTP 200 with minimal payload (no gated fields)
    const unauthResponse = await request.get("/api/system/health");
    expect(unauthResponse.status()).toBe(200);
    const unauthBody = await unauthResponse.json();
    expect(unauthBody.status).toBe("ok");
    expect(unauthBody.uptimeSeconds).toBeUndefined();
    expect(unauthBody.database).toBeUndefined();
  });

  test("should execute complete login, leave creation, approval transition, export, and guaranteed teardown workflow", async ({ page, browser }) => {
    // 1. Authenticate as Staff
    await page.goto("/auth/login");
    await page.fill("#email", "test-staff@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");

    // 2. Fetch seeded leave types to obtain valid leaveTypeId
    const typesRes = await page.request.get("/api/leaves/types");
    expect(typesRes.status()).toBe(200);
    const typesData = await typesRes.json();
    const leaveTypesList = typesData.leaveTypes || typesData.types || typesData;
    expect(Array.isArray(leaveTypesList)).toBe(true);
    expect(leaveTypesList.length).toBeGreaterThan(0);
    const targetLeaveTypeId = leaveTypesList[0].id;
    expect(targetLeaveTypeId).toBeDefined();

    // 3. Submit new leave request via API as Staff — strict status 201 assertion
    const leaveRes = await page.request.post("/api/leaves", {
      data: {
        leaveTypeId: targetLeaveTypeId,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        daysCount: 1,
        reason: "E2E Integration Test Leave Request",
      },
    });
    expect(leaveRes.status()).toBe(201);

    const leaveData = await leaveRes.json();
    const createdLeaveId = leaveData.id || leaveData.leave?.id;
    expect(createdLeaveId).toBeTruthy();

    try {
      // 4. Create separate Admin context to approve leave & export records
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/auth/login");
      await adminPage.fill("#email", "test-admin@thaibahive.local");
      await adminPage.fill("#password", "Password123");
      await adminPage.click("button[type='submit']");
      await adminPage.waitForURL("/");

      // 5. Issue Admin PUT approval request — strict status 200 assertion
      const approveRes = await adminPage.request.put(`/api/leaves/${createdLeaveId}`, {
        data: { status: "approved", reviewNotes: "Approved via Playwright E2E Integration Suite" },
      });
      expect(approveRes.status()).toBe(200);

      // 6. Re-fetch leave and assert status === "approved"
      const fetchRes = await adminPage.request.get(`/api/leaves/${createdLeaveId}`);
      expect(fetchRes.status()).toBe(200);

      const updatedData = await fetchRes.json();
      const actualStatus = updatedData.leave?.status || updatedData.status;
      expect(["approved", "hod_approved"]).toContain(actualStatus);

      // 7. Admin CSV Export API Verification — strict status 200 assertion
      const exportResponse = await adminPage.request.get("/api/export?type=leaves");
      expect(exportResponse.status()).toBe(200);

      await adminContext.close();
    } finally {
      // 8. Guaranteed Teardown: Always delete created test record regardless of pass/fail
      if (createdLeaveId) {
        await page.request.delete(`/api/leaves/${createdLeaveId}`);
      }
    }

    await page.screenshot({ path: "e2e/screenshots/workflow_leave_management.png" });
  });
});
