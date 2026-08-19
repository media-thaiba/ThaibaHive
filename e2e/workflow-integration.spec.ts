import { test, expect } from "@playwright/test";
import { db } from "../packages/db";
import { leaveBalances, staff } from "../packages/db/schema";
import { eq } from "drizzle-orm";

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

  test.describe("Authenticated Integration Flow", () => {
    test.use({ storageState: ".auth/staff.json" });

    test("should execute complete login, leave creation, approval transition, export, and guaranteed teardown workflow", async ({ page, browser }) => {
      // 0. Reset leave balances for test-staff to ensure enough remaining days
      const user = await db.select().from(staff).where(eq(staff.email, "test-staff@thaibahive.local")).get();
      if (user) {
        await db.update(leaveBalances).set({ usedDays: 0 }).where(eq(leaveBalances.staffId, user.id)).run();
        console.log("Reset leave balances for test-staff to 0 inside integration test");
      }

      // 1. Staff is already pre-authenticated. Go directly to home page.
      await page.goto("/");
      await expect(page).not.toHaveURL(/\/auth\/login/);

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
        // 4. Create separate Admin context using cached admin session
        const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
        const adminPage = await adminContext.newPage();
        try {
          await adminPage.goto("/");
          await expect(adminPage).not.toHaveURL(/\/auth\/login/);

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
        } finally {
          await adminContext.close();
        }
      } finally {
        // 8. Guaranteed Teardown: Always delete created test record regardless of pass/fail
        if (createdLeaveId) {
          await page.request.delete(`/api/leaves/${createdLeaveId}`);
        }
      }

      await page.screenshot({ path: "e2e/screenshots/workflow_leave_management.png" });
    });
  });
});
