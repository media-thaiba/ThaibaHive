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

      for (const [href, visibility] of Object.entries(NAV_VISIBILITY_MATRIX)) {
        const shouldBeVisible = visibility[role] === true;
        const label = href.split("/").pop() || href;

        test(`"${label}" (${href}) should be ${shouldBeVisible ? "visible" : "hidden"}`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/");
          await page.waitForLoadState("networkidle");
          await gating.expectSidebarLinkVisible(href, shouldBeVisible);
        });
      }
    });
  }
});

// ========== Test: Bottom Navigation Visibility by Role ==========

test.describe("Bottom Navigation Visibility by Role", () => {
  const roles = getAvailableRoles();

  for (const role of roles) {
    test.describe(`Role: ${role}`, () => {
      test.use({ storageState: getAuthStatePath(role) });

      test("primary nav items match sidebar visibility", async ({ page }) => {
        const gating = new RoleGatingPage(page);
        await page.goto("/");
        await page.waitForLoadState("networkidle");

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
        const canCreate = DASHBOARD_ACTION_VISIBILITY["finance:new-request"][role];
        const canExport = DASHBOARD_ACTION_VISIBILITY["finance:export"][role];

        test(`New Request button ${canCreate ? "visible" : "hidden"}`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/finance");
          await gating.expectFinanceDashboardLoaded();
          await gating.expectFinanceNewRequestVisible(canCreate);
        });

        test(`Export button ${canExport ? "visible" : "hidden"}`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/finance");
          await gating.expectFinanceDashboardLoaded();
          await gating.expectFinanceExportVisible(canExport);
        });
      });
    }
  });

  // ========== Alumni Portal ==========
  
  test.describe("Alumni Portal (/portal/alumni)", () => {
    const tabs = ["AI Mentor Match", "Job Board", "Endowments", "Homecoming & Events"];

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });
        for (const tab of tabs) {
          const key = `alumni:${tab.toLowerCase().replace(/ /g, "-").replace("&", "")}`;
          const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? true;

          test(`"${tab}" tab ${shouldBeVisible ? "visible" : "hidden"}`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            await page.goto("/portal/alumni");
            await gating.expectAlumniPortalLoaded();
            await gating.expectAlumniTabVisible(tab, shouldBeVisible);
          });
        }
      });
    }
  });

  // ========== Supply Cockpit ==========
  
  test.describe("Supply Cockpit (/operations/supply)", () => {
    const tabs = ["3-Way Matching", "Purchase Orders", "Vendor Directory"];

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });
        for (const tab of tabs) {
          const key = `supply:${tab.toLowerCase().replace(/ /g, "-")}`;
          const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[key]?.[role] ?? true;

          test(`"${tab}" tab ${shouldBeVisible ? "visible" : "hidden"}`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            await page.goto("/operations/supply");
            await gating.expectSupplyCockpitLoaded();
            await gating.expectSupplyTabVisible(tab, shouldBeVisible);
          });
        }

        const canCreateRequisition = DASHBOARD_ACTION_VISIBILITY["supply:new-requisition"][role];
        test(`New Requisition button ${canCreateRequisition ? "visible" : "hidden"}`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/operations/supply");
          await gating.expectSupplyCockpitLoaded();
          await gating.expectSupplyNewRequisitionVisible(canCreateRequisition);
        });
      });
    }
  });

  // ========== Vision Shield ==========
  
  test.describe("Vision Shield (/admin/operations/vision-shield)", () => {
    const tabs = ["3D Vision Radar", "Threat Alerts & Incidents", "Guard Dispatch", "ALPR & Gate Access", "Privacy Vault"];

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });
        for (const tab of tabs) {
          const shortKey = `vision:${tab.toLowerCase().split(" ")[0]}`;
          const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[shortKey]?.[role] ?? false;

          test(`"${tab}" tab ${shouldBeVisible ? "visible" : "hidden"}`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            await page.goto("/admin/operations/vision-shield");
            await gating.expectVisionShieldLoaded();
            await gating.expectVisionTabVisible(tab, shouldBeVisible);
          });
        }

        // Lockdown button - only super_admin and admin
        const canLockdown = DASHBOARD_ACTION_VISIBILITY["vision:lockdown"][role];
        test(`LOCKDOWN button ${canLockdown ? "visible" : "hidden"}`, async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/admin/operations/vision-shield");
          await gating.expectVisionShieldLoaded();
          await gating.expectVisionLockdownVisible(canLockdown);
        });
      });
    }
  });

  // ========== Facility Mind ==========
  
  test.describe("Facility Mind (/admin/operations/facility-mind)", () => {
    const tabs = ["Equipment Studio & Twin", "Predictive Matrix", "Work Order Radar", "Parts Inventory", "Energy & Load Shed"];

    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });
        for (const tab of tabs) {
          const shortKey = `facility:${tab.toLowerCase().split(" ")[0]}`;
          const shouldBeVisible = DASHBOARD_ACTION_VISIBILITY[shortKey]?.[role] ?? false;

          test(`"${tab}" tab ${shouldBeVisible ? "visible" : "hidden"}`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            await page.goto("/admin/operations/facility-mind");
            await gating.expectFacilityMindLoaded();
            await gating.expectFacilityTabVisible(tab, shouldBeVisible);
          });
        }
      });
    }
  });

  // ========== Portal Pages ==========
  
  test.describe("Portal Pages", () => {
    for (const role of allRoles) {
      test.describe(`Role: ${role}`, () => {
        test.use({ storageState: getAuthStatePath(role) });

        test("Facilities Discovery portal access", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/portal/facilities");
          const canAccess = DASHBOARD_ACTION_VISIBILITY["facilities:spaces"][role];
          if (canAccess) {
            await gating.expectFacilitiesPortalLoaded();
          } else {
            await expect(page.locator('text=Access requires facility permissions')).toBeVisible({ timeout: 5000 });
          }
        });

        test("Fees Portal access", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/portal/fees");
          const canAccess = DASHBOARD_ACTION_VISIBILITY["fees:view"][role];
          if (canAccess) {
            await gating.expectFeesPortalLoaded();
          } else {
            await expect(page.locator('text=Access requires finance permissions')).toBeVisible({ timeout: 5000 });
          }
        });

        test("Documents Portal access", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/portal/documents");
          const canAccess = DASHBOARD_ACTION_VISIBILITY["documents:read"][role];
          if (canAccess) {
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

        test("Staff Present card visibility", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/");
          await gating.expectDashboardLoaded();
          await gating.expectDashboardStaffPresentCardVisible(DASHBOARD_ACTION_VISIBILITY["dashboard:staff-present"][role]);
        });

        test("Profile Completion card visibility", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/");
          await gating.expectDashboardLoaded();
          await gating.expectDashboardProfileCompletionCardVisible(DASHBOARD_ACTION_VISIBILITY["dashboard:profile-completion"][role]);
        });

        test("Pending Approvals card visibility", async ({ page }) => {
          const gating = new RoleGatingPage(page);
          await page.goto("/");
          await gating.expectDashboardLoaded();
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
    for (const role of nonAdminRoles) {
      if (!AUTH_FINANCE_ROLES.includes(role as any)) {
        test.describe(`Role: ${role}`, () => {
          test.use({ storageState: getAuthStatePath(role) });

          test(`cannot POST /api/finance/fees/structures`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/finance/fees/structures", "POST", {
              institutionId: "inst_campus_main",
              name: "Test Fee",
              code: "TEST-FEE",
              academicYear: "2025-2026",
              totalAmount: 10000,
            });
          });

          test(`cannot POST /api/approvals`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/approvals", "POST", {
              type: "expense",
              amount: 5000,
              description: "Test expense",
            });
          });
        });
      }
    }
  });

  // Supply endpoints
  test.describe("Supply API 403 for non-purchase roles", () => {
    for (const role of nonAdminRoles) {
      if (!AUTH_PURCHASE_ROLES.includes(role as any)) {
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
    }
  });

  // Vision Shield endpoints
  test.describe("Vision Shield API 403 for non-admin roles", () => {
    for (const role of nonAdminRoles) {
      if (!AUTH_ADMIN_ROLES.includes(role as any)) {
        test.describe(`Role: ${role}`, () => {
          test.use({ storageState: getAuthStatePath(role) });

          test(`cannot POST /api/vision/lockdown`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/vision/lockdown", "POST", {
              scope: "campus",
              targetFacilityId: "bldg_eng",
              reason: "Test lockdown",
            });
          });

          test(`cannot GET /api/vision/alerts/stream`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/vision/alerts/stream", "GET");
          });
        });
      }
    }
  });

  // Facility endpoints
  test.describe("Facility API 403 for non-admin roles", () => {
    for (const role of nonAdminRoles) {
      if (!AUTH_ADMIN_ROLES.includes(role as any) && !AUTH_HOD_AND_ABOVE.includes(role as any)) {
        test.describe(`Role: ${role}`, () => {
          test.use({ storageState: getAuthStatePath(role) });

          test(`cannot POST /api/facility/workorders`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/facility/workorders", "POST", {
              title: "Test Work Order",
              buildingId: "bldg_eng",
              category: "hvac",
              priority: "high",
            });
          });

          test(`cannot POST /api/facility/dispatch`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/facility/dispatch", "POST", {
              workOrderNumber: "WO-TEST-001",
              requiredSkill: "hvac",
            });
          });
        });
      }
    }
  });

  // Admin endpoints
  test.describe("Admin API 403 for non-admin roles", () => {
    for (const role of nonAdminRoles) {
      if (!AUTH_ADMIN_ROLES.includes(role as any)) {
        test.describe(`Role: ${role}`, () => {
          test.use({ storageState: getAuthStatePath(role) });

          test(`cannot GET /admin/scheduled-jobs`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/admin/scheduled-jobs", "GET");
          });

          test(`cannot POST /api/admin/sync-policies`, async ({ page }) => {
            const gating = new RoleGatingPage(page);
            
            await gating.callApiAndExpectForbidden("/api/admin/sync-policies", "POST", {
              policyId: "test-policy",
              enabled: true,
            });
          });
        });
      }
    }
  });
});

// ========== Test: Unauthenticated Access ==========

test.describe("Unauthenticated Access (401/Redirect)", () => {
  test("unauthenticated user redirected to login for protected routes", async ({ page }) => {
    const protectedRoutes = [
      "/",
      "/finance",
      "/portal/alumni",
      "/operations/supply",
      "/admin/operations/vision-shield",
      "/admin/operations/facility-mind",
      "/portal/facilities",
      "/portal/fees",
      "/portal/documents",
    ];

    for (const route of protectedRoutes) {
      await test.step(`Route: ${route}`, async () => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
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
      await expect(page.locator("text=Academic Dashboard")).toBeVisible({ timeout: 10000 });

      await page.goto("/admin/nfc");
      await expect(page.locator("text=Access Restricted")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("accounts", () => {
    test.use({ storageState: getAuthStatePath("accounts") });
    test("accounts can access /accounts but not /admin/nfc", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/accounts");
      await expect(page.locator("text=Accounts")).toBeVisible({ timeout: 10000 });

      await page.goto("/admin/nfc");
      await expect(page.locator("text=Access Restricted")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("purchase", () => {
    test.use({ storageState: getAuthStatePath("purchase") });
    test("purchase can access /purchases but not /accounts", async ({ page }) => {
      const gating = new RoleGatingPage(page);

      await page.goto("/purchases");
      await expect(page.locator("text=Purchases")).toBeVisible({ timeout: 10000 });

      await page.goto("/accounts");
      await expect(page.locator("text=Access Restricted")).toBeVisible({ timeout: 15000 });
    });
  });
});