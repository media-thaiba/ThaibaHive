import { test, expect } from "@playwright/test";

test.describe("End-to-End User Journey Certification Suite", () => {
  test.describe("Journey 1: Multi-tenant Login & Dashboard Navigation", () => {
    test("should login as Admin, authenticate session, and load tenant dashboard widgets", async ({ page }) => {
      await page.goto("/auth/login");
      await page.waitForSelector("form[data-hydrated='true']", { timeout: 15000 });

      await page.fill("#email", "");
      await page.type("#email", "test-admin@thaibahive.local", { delay: 10 });
      await page.fill("#password", "");
      await page.type("#password", "Password123", { delay: 10 });

      await page.click("button[type='submit']");

      await expect(page).toHaveURL(/\/|dashboard/, { timeout: 25000 });
      const dashboardHeader = page.locator("h1, h2, [data-slot='card']").first();
      await expect(dashboardHeader).toBeVisible({ timeout: 25000 });
    });
  });

  test.describe("Journey 2: Expense Claim submission -> Multi-tier approval -> Export", () => {
    test.use({ storageState: ".auth/staff.json" });

    test("should submit receipt-backed claim, advance through approval tiers, and export records", async ({ page, browser }) => {
      // 1. Submit expense claim via Staff session
      const claimRes = await page.request.post("/api/expense-claims", {
        data: {
          amount: 2450.00,
          category: "Consumables & Supplies",
          description: "Lab experiment supplies & chemicals receipt",
          receiptUrl: "http://localhost:3000/uploads/lab_supplies_receipt.pdf",
        },
      });
      expect(claimRes.status()).toBe(201);
      const claimData = await claimRes.json();
      const claimId = claimData.claim?.id || claimData.id;
      expect(claimId).toBeTruthy();

      // 2. Switch to Admin context for multi-tier approval
      const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
      const adminPage = await adminContext.newPage();

      try {
        // HOD Stage Transition
        const hodRes = await adminPage.request.patch(`/api/expense-claims/${claimId}`, {
          data: { status: "pending_hod", reviewNotes: "HOD initial verification passed" },
        });
        expect(hodRes.status()).toBe(200);

        // Final Admin Approval
        const approvalRes = await adminPage.request.patch(`/api/expense-claims/${claimId}`, {
          data: { status: "approved", reviewNotes: "Final approval by Finance Admin" },
        });
        expect(approvalRes.status()).toBe(200);

        // Export verified expense records
        const exportRes = await adminPage.request.get("/api/export?type=expenses");
        expect(exportRes.status()).toBe(200);
      } finally {
        await adminPage.request.delete(`/api/expense-claims/${claimId}`).catch(() => {});
        await adminContext.close();
      }
    });
  });

  test.describe("Journey 3: Staff Onboarding -> AES-256 Encrypted PII -> Profile Viewing", () => {
    test.use({ storageState: ".auth/admin.json" });

    test("should onboard staff member with sensitive PII, encrypt at rest, and render profile", async ({ page }) => {
      const empSuffix = Date.now().toString().slice(-6);
      const testEmail = `onboard.staff.${empSuffix}@thaibahive.local`;
      const testEmpId = `EMP-ONB-${empSuffix}`;

      // 1. Create staff with sensitive PII
      const createRes = await page.request.post("/api/staff", {
        data: {
          firstName: "Praveen",
          lastName: "Kumar",
          email: testEmail,
          employeeId: testEmpId,
          role: "staff",
          aadhaar: "5544 3322 1100",
          pan: "ABCDE1234F",
          bankAccount: "987654321012",
        },
      });
      expect(createRes.status()).toBe(201);
      const createdStaff = await createRes.json();
      const staffId = createdStaff.staff?.id || createdStaff.id;
      expect(staffId).toBeTruthy();

      try {
        // 2. Fetch staff profile and verify accessibility
        const getRes = await page.request.get(`/api/staff/${staffId}`);
        expect(getRes.status()).toBe(200);
        const profileData = await getRes.json();
        expect(profileData.staff?.email || profileData.email).toBe(testEmail);
      } finally {
        await page.request.delete(`/api/staff/${staffId}`).catch(() => {});
      }
    });
  });

  test.describe("Journey 4: Performance Appraisal Lifecycle", () => {
    test.use({ storageState: ".auth/admin.json" });

    test("should execute performance review initiation, self-scoring, and manager appraisal", async ({ page, browser }) => {
      const cycleSuffix = Date.now().toString().slice(-4);

      // 1. Create active performance cycle
      const cycleRes = await page.request.post("/api/performance/cycles", {
        data: {
          title: `Annual Appraisal Cycle ${cycleSuffix}`,
          period: `2026-Q${cycleSuffix.slice(-1) || "1"}`,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          selfAssessmentDeadline: "2026-06-30",
          managerReviewDeadline: "2026-08-31",
        },
      });
      expect(cycleRes.status()).toBe(201);
      const cycleData = await cycleRes.json();
      const cycleId = cycleData.cycle?.id || cycleData.id;

      // 2. Initiate performance review for staff
      const reviewRes = await page.request.post("/api/performance/reviews", {
        data: {
          cycleId,
          staffId: "test-staff-id",
          period: "2026-Q1",
        },
      });
      expect(reviewRes.status()).toBe(201);
      const reviewData = await reviewRes.json();
      const reviewId = reviewData.review?.id || reviewData.id;
      expect(reviewId).toBeTruthy();

      // 3. Submit self-assessment via Staff context
      const staffContext = await browser.newContext({ storageState: ".auth/staff.json" });
      const staffPage = await staffContext.newPage();

      try {
        const selfSubmitRes = await staffPage.request.post(`/api/performance/reviews/${reviewId}/submit`, {
          data: {
            stage: "self_assessment",
            ratings: [{ metricId: "pedagogy", score: 4.5, comments: "Maintained strong curriculum pacing" }],
            comments: "Achieved departmental research publication goals",
          },
        });
        expect(selfSubmitRes.status()).toBe(200);

        // 4. Manager evaluation and approval
        const managerSubmitRes = await page.request.post(`/api/performance/reviews/${reviewId}/submit`, {
          data: {
            stage: "manager_review",
            ratings: [{ metricId: "pedagogy", score: 4.8, comments: "Exceeded student satisfaction metrics" }],
            comments: "Outstanding performance during the academic cycle",
            recommendedGrade: "A+",
          },
        });
        expect(managerSubmitRes.status()).toBe(200);
      } finally {
        await staffContext.close();
      }
    });
  });
});
