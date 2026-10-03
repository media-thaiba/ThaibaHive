import { test, expect } from "@playwright/test";
import { RoleGatingPage, NAV_VISIBILITY_MATRIX, DASHBOARD_ACTION_VISIBILITY, E2E_ROLES } from "./helpers/role-gating-page";
import { getAuthStatePath, getAvailableRoles, ADMIN_ROLES as AUTH_ADMIN_ROLES, PRINCIPAL_AND_ABOVE as AUTH_PRINCIPAL_AND_ABOVE, HOD_AND_ABOVE as AUTH_HOD_AND_ABOVE, FINANCE_ROLES as AUTH_FINANCE_ROLES, PURCHASE_ROLES as AUTH_PURCHASE_ROLES, ALL_STAFF_ROLES as AUTH_ALL_STAFF_ROLES } from "./helpers/auth-helper";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), ".auth");

// ========== Helper Functions ==========

function authStateExists(role: string): boolean {
  return fs.existsSync(path.join(AUTH_DIR, `${role}.json`));
}

// ========== Test: Authentication State Verification ==========

test.describe("E2E Auth State Availability", () => {
  test("all 7 role auth states exist", () => {
    const missing = E2E_ROLES.filter(r => !authStateExists(r));
    expect(missing, `Missing auth states: ${missing.join(", ")}`).toHaveLength(0);
  });
});

// ========== Test: Navigation Visibility by Role ==========

test.describe("Sidebar Navigation Visibility by Role", () => {
  const roles = getAvailableRoles();

  for (const role of roles) {
    test.describe(`Role: ${role}`, () => {
      test.use({ storageState: getAuthStatePath(role) });

      test("all sidebar links match RBAC matrix", async ({ page }) => {
        const gating = new RoleGatingPage(page);
        await page.goto("/");
        await gating.expectDashboardLoaded();

        for (const [href, visibility] of Object.entries(NAV_VISIBILITY_MATRIX)) {
          const shouldBeVisible = visibility[role] === true;
          await gating.expectSidebarLinkVisible(href, shouldBeVisible);
        }
      });
    });
  }
});

// ========== Test: Bottom Navigation Visibility by Role ==========

test.describe("Bottom Navigation Visibility by Role", () => {
  const roles = getAvailableRoles();

  for (const role of roles) {
    test.describe(`Role: ${role}`, () => {
      test.use({ storageState: getAuthStatePath(role), viewport: { width: 375, height: 667 } });

      test("primary nav items match sidebar visibility", async ({ page }) => {
        const gating = new RoleGatingPage(page);
        await page.goto("/");

        // Primary nav items: Home, Attendance, Tasks, Leaves
        await gating.expectBottomNavLinkVisible("/", NAV_VISIBILITY_MATRIX["/attendance"][role]);
        await gating.expectBottomNavLinkVisible("/attendance", NAV_VISIBILITY_MATRIX["/attendance"][role]);
        await gating.expectBottomNavLinkVisible("/tasks", NAV_VISIBILITY_MATRIX["/tasks"][role]);
        await gating.expectBottomNavLinkVisible("/leaves", NAV_VISIBILITY_MATRIX["/leaves"][role]);
      });
    });
  }
});

// ========== Test: Dashboard Action Button Gating ==========

test.describe("Dashboard Action Button Gating by Role", () => {
  const allRoles = AUTH_ALL_STAFF_ROLES.filter(r => authStateExists(r));

  // ========== Finance Dashboard ==========
  
  test.describe("Finance Dashboard (/finance)", () => {
    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("action buttons match visibility permissions", async ({ page }) => {
          const canCreate = DASHBOARD_ACTION_VISIBILITY["finance:new-request"][role];
          const canExport = DASHBOARD_ACTION_VISIBILITY["finance:export"][role];

          const gating = new RoleGatingPage(page);
          await page.goto("/finance");
          await gating.expectFinanceDashboardLoaded();
          await gating.expectFinanceNewRequestVisible(canCreate);
          await gating.expectFinanceExportVisible(canExport);
        });
      });
    }
  });

  // ========== Alumni Portal ==========
  
  test.describe("Alumni Portal (/portal/alumni)", () => {
    const tabMap: Record<string, string> = {
      "AI Mentor Match": "alumni:mentors",
      "Job Board": "alumni:jobs",
      "Endowments": "alumni:endowments",
      "Homecoming & Events": "alumni:events",
    };

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("tabs match visibility permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/portal/alumni");
          await gating.expectAlumniPortalLoaded();

          for (const [tab, key] of Object.entries(tabMap)) {
            const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? false;
            await gating.expectAlumniTabVisible(tab, shouldBeVisible);
          }
        });
      });
    }
  });

  // ========== Supply Cockpit ==========
  
  test.describe("Supply Cockpit (/operations/supply)", () => {
    const tabMap: Record<string, string> = {
      "3-Way Matching": "supply:reconciliation",
      "Purchase Orders": "supply:orders",
      "Vendor Directory": "supply:vendors",
    };

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("tabs and actions match visibility permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/operations/supply");
          await gating.expectSupplyCockpitLoaded();

          for (const [tab, key] of Object.entries(tabMap)) {
            const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? false;
            await gating.expectSupplyTabVisible(tab, shouldBeVisible);
          }

          const canCreateRequisition = DASHBOARD_ACTION_VISIBILITY["supply:new-requisition"][role];
          await gating.expectSupplyNewRequisitionVisible(canCreateRequisition);
        });
      });
    }
  });

  // ========== Vision Shield ==========
  
  test.describe("Vision Shield (/admin/operations/vision-shield)", () => {
    const tabMap: Record<string, string> = {
      "3D Vision Radar": "vision:radar",
      "Threat Alerts & Incidents": "vision:threats",
      "Guard Dispatch": "vision:guards",
      "ALPR & Gate Access": "vision:alpr",
      "Privacy Vault": "vision:privacy",
    };

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("tabs and lockdown button match visibility permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/admin/operations/vision-shield");
          await gating.expectVisionShieldLoaded();

          for (const [tab, key] of Object.entries(tabMap)) {
            const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? false;
            await gating.expectVisionTabVisible(tab, shouldBeVisible);
          }

          const canLockdown = DASHBOARD_ACTION_VISIBILITY["vision:lockdown"][role];
          await gating.expectVisionLockdownVisible(canLockdown);
        });
      });
    }
  });

  // ========== Facility Mind ==========
  
  test.describe("Facility Mind (/admin/operations/facility-mind)", () => {
    const tabMap: Record<string, string> = {
      "Equipment Studio & Twin": "facility:equipment",
      "Predictive Matrix": "facility:predictive",
      "Work Order Radar": "facility:workorders",
      "Parts Inventory": "facility:inventory",
      "Energy & Load Shed": "facility:energy",
    };

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("tabs match visibility permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/admin/operations/facility-mind");
          await gating.expectFacilityMindLoaded();

          for (const [tab, key] of Object.entries(tabMap)) {
            const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? false;
            await gating.expectFacilityTabVisible(tab, shouldBeVisible);
          }
        });
      });
    }
  });

  // ========== Portal Pages ==========
  
  test.describe("Portal Pages", () => {
    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("portal page access permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);

          // Facilities
          await page.goto("/portal/facilities");
          const canAccessFacilities = DASHBOARD_ACTION_VISIBILITY["facilities:spaces"][role];
          if (canAccessFacilities) {
            await gating.expectFacilitiesPortalLoaded();
          } else {
            await expect(page.locator('text=Access requires facility permissions')).toBeVisible({ timeout: 5000 });
          }

          // Fees
          await page.goto("/portal/fees");
          const canAccessFees = DASHBOARD_ACTION_VISIBILITY["fees:view"][role];
          if (canAccessFees) {
            await gating.expectFeesPortalLoaded();
          } else {
            await expect(page.locator('text=Access requires finance permissions')).toBeVisible({ timeout: 5000 });
          }

          // Documents
          await page.goto("/portal/documents");
          const canAccessDocs = DASHBOARD_ACTION_VISIBILITY["documents:read"][role];
          if (canAccessDocs) {
            await gating.expectDocumentsPortalLoaded();
          } else {
            await expect(page.locator('text=Access requires document permissions')).toBeVisible({ timeout: 5000 });
          }
        });
      });
    }
  });

  // ========== Main Dashboard ==========
  
  test.describe("Main Dashboard (/) Metrics Cards", () => {
    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("dashboard metric cards match permissions", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/");
          await gating.expectDashboardLoaded();

          await gating.expectDashboardStaffPresentCardVisible(DASHBOARD_ACTION_VISIBILITY["dashboard:staff-present"][role]);
          await gating.expectDashboardProfileCompletionCardVisible(DASHBOARD_ACTION_VISIBILITY["dashboard:profile-completion"][role]);
          await gating.expectDashboardPendingApprovalsCardVisible(DASHBOARD_ACTION_VISIBILITY["dashboard:pending-approvals"][role]);
        });
      });
    }
  });
});

// ========== Test: Forbidden API Call Interceptions ==========

test.describe("Forbidden API Call Interceptions (Direct 403)", () => {
  const nonAdminRoles = ["staff", "accounts", "purchase", "hod", "principal"].filter(r => authStateExists(r));

  // Finance endpoints
  test.describe("Finance API 403 for non-finance roles", () => {
    const nonFeeManageRoles = ["staff", "purchase", "hod"].filter(r => authStateExists(r));
    for (const role of nonFeeManageRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test(`cannot call finance write endpoints`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          
          await gating.callApiAndExpectForbidden("/api/finance/fees/structures", "POST", {
            institutionId: "inst_campus_main",
            name: "Test Fee",
            code: "TEST-FEE",
            academicYear: "2025-2026",
            totalAmount: 10000,
          });

          await gating.callApiAndExpectForbidden("/api/finance/tax-rates/jurisdictions", "POST", {
            name: "Kerala Tax Zone",
            code: "KL-TAX",
            country: "India",
            stateOrProvince: "Kerala",
            defaultRatePercent: 18,
          });
        });
      });
    }
  });

  // Supply endpoints
  test.describe("Supply API 403 for non-purchase roles", () => {
    const nonSupplyManageRoles = ["staff", "accounts", "hod"].filter(r => authStateExists(r));
    for (const role of nonSupplyManageRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test(`cannot POST /api/supply/orders`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          
          await gating.callApiAndExpectForbidden("/api/supply/orders", "POST", {
            vendorId: "test-vendor",
            items: [{ sku: "TEST-001", quantity: 10, unitPrice: 100 }],
          });
        });
      });
    }
  });

  // Vision Shield endpoints
  test.describe("Vision Shield API 403 for non-lockdown roles", () => {
    const nonLockdownRoles = ["staff", "accounts", "purchase", "hod"].filter(r => authStateExists(r));
    for (const role of nonLockdownRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test(`cannot access vision lockdown API`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          
          await gating.callApiAndExpectForbidden("/api/vision/lockdown", "POST", {
            scope: "campus",
            targetFacilityId: "bldg_eng",
            reason: "Test lockdown",
          });
        });
      });
    }
  });

  // Facility endpoints
  test.describe("Facility API 403 for non-facility roles", () => {
    const nonFacilityRoles = ["accounts", "purchase"].filter(r => authStateExists(r));
    for (const role of nonFacilityRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test(`cannot call facility workorders or dispatch APIs`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          
          await gating.callApiAndExpectForbidden("/api/facility/workorders", "POST", {
            title: "Test Work Order",
            buildingId: "bldg_eng",
            category: "hvac",
            priority: "high",
          });
        });
      });
    }
  });

  // Admin endpoints
  test.describe("Admin API 403 for non-admin roles", () => {
    const nonAdminUserRoles = ["staff", "accounts", "purchase", "hod", "principal"].filter(r => authStateExists(r));
    for (const role of nonAdminUserRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test(`cannot access admin scheduled jobs or sync policies`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          
          await gating.callApiAndExpectForbidden("/api/admin/scheduled-jobs", "GET");

          await gating.callApiAndExpectForbidden("/api/admin/scheduled-jobs", "POST", {
            type: "attendance_summary",
            format: "csv",
          });
        });
      });
    }
  });
});

// ========== Test: Unauthenticated Access ==========

test.describe("Unauthenticated Access (401/Redirect)", () => {
  test("unauthenticated user redirected to login or landing portal for protected routes", async ({ page }) => {
    const protectedRoutes = [
      { path: "/", expectedUrl: /\/(portal\/tgcis|auth\/login)/ },
      { path: "/finance", expectedUrl: /\/auth\/login/ },
      { path: "/portal/alumni", expectedUrl: /\/auth\/login/ },
      { path: "/operations/supply", expectedUrl: /\/auth\/login/ },
      { path: "/admin/operations/vision-shield", expectedUrl: /\/auth\/login/ },
      { path: "/admin/operations/facility-mind", expectedUrl: /\/auth\/login/ },
      { path: "/portal/facilities", expectedUrl: /\/auth\/login/ },
      { path: "/portal/fees", expectedUrl: /\/auth\/login/ },
      { path: "/portal/documents", expectedUrl: /\/auth\/login/ },
    ];

    for (const { path: route, expectedUrl } of protectedRoutes) {
      await test.step(`Route: ${route}`, async () => {
        await page.goto(route);
        await expect(page).toHaveURL(expectedUrl, { timeout: 15000 });
      });
    }
  });

  test("unauthenticated API calls return 401", async ({ page }) => {
    const apiEndpoints = [
      { url: "/api/finance/fees/structures", method: "GET" },
      { url: "/api/supply/orders", method: "GET" },
      { url: "/api/vision/alerts", method: "GET" },
      { url: "/api/facility/equipment", method: "GET" },
    ];

    for (const endpoint of apiEndpoints) {
      await test.step(`${endpoint.method} ${endpoint.url}`, async () => {
        const response = await page.request.fetch(endpoint.url, { method: endpoint.method });
        expect(response.status()).toBe(401);
        const json = await response.json();
        expect(json.error).toBe("Not authenticated");
      });
    }
  });
});

// ========== Test: Cross-Role Navigation ==========

test.describe("Cross-Role Navigation Edge Cases", () => {
  test.describe("staff", () => {
    test.use({ storageState: getAuthStatePath("staff") });
    test("staff cannot access /admin routes directly", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/admin/scheduled-jobs");
      await expect(page.locator("text=Access Restricted")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("hod", () => {
    test.use({ storageState: getAuthStatePath("hod") });
    test("hod cannot access /admin/nfc", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/admin/nfc");
      await expect(page.locator("text=Access Restricted")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("principal", () => {
    test.use({ storageState: getAuthStatePath("principal") });
    test("principal can access /academic but not /admin/nfc", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/academic");
      await expect(page.locator('h1:has-text("Academic Dashboard")').first()).toBeVisible({ timeout: 10000 });

      await page.goto("/admin/nfc");
      await expect(page.locator("text=Access Restricted").first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("accounts", () => {
    test.use({ storageState: getAuthStatePath("accounts") });
    test("accounts can access /accounts but not /admin/nfc", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/accounts");
      await expect(page.locator('h1:has-text("Institutional Financials"), h1:has-text("Accounts")').first()).toBeVisible({ timeout: 10000 });

      await page.goto("/admin/nfc");
      await expect(page.locator("text=Access Restricted").first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("purchase", () => {
    test.use({ storageState: getAuthStatePath("purchase") });
    test("purchase can access /purchases but not /accounts", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/purchases");
      await expect(page.locator('h1:has-text("Purchases"), h1:has-text("Purchase")').first()).toBeVisible({ timeout: 10000 });

      await page.goto("/accounts");
      await expect(page.locator("text=Access Restricted").first()).toBeVisible({ timeout: 15000 });
    });
  });
});