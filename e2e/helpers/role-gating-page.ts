import { type Page, type Locator, expect } from "@playwright/test";
import { E2E_ROLES } from "./auth-helper";

export { E2E_ROLES };

export class RoleGatingPage {
  readonly page: Page;
  readonly sidebarNav: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarNav = page.locator('aside nav[aria-label$=" navigation"]');
    this.bottomNav = page.locator('nav[aria-label="Bottom navigation"], nav[aria-label="Mobile navigation"]');
  }

  // ========== Sidebar Navigation ==========
  sidebarLink(href: string): Locator {
    return this.sidebarNav.locator(`a[href="${href}"]`).first();
  }

  sidebarLinkByLabel(label: string): Locator {
    return this.sidebarNav.locator(`a:has-text("${label}")`).first();
  }

  /**
   * Switch active workspace via the always-visible shell-nav switcher.
   * Returns false when the role cannot access the workspace (setWorkspace
   * is a no-op then, so the sidebar label never changes).
   */
  async switchWorkspace(label: string): Promise<boolean> {
    const button = this.page.locator(`button[aria-label="Switch to ${label} workspace"]`).first();
    const isAvailable = await button.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isAvailable) {
      return false;
    }
    await button.click();
    const nav = this.page.locator(`nav[aria-label="${label} navigation"]`);
    try {
      await expect(nav).toBeVisible({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /** The sidebar renders a single collapsible group for the active workspace. */
  async ensureSidebarGroupExpanded() {
    const toggle = this.sidebarNav.locator("button[aria-expanded]").first();
    if ((await toggle.count()) > 0) {
      if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 3000 });
      }
    }
  }

  // ========== Bottom Navigation ==========
  bottomNavLink(href: string): Locator {
    return this.bottomNav.locator(`a[href="${href}"]`).first();
  }

  // ========== Navigation Groups ==========
  // Daily Work (My Work workspace)
  readonly attendanceLink = () => this.sidebarLink("/my-work/attendance");
  readonly tasksLink = () => this.sidebarLink("/my-work/tasks");
  readonly reportsLink = () => this.sidebarLink("/my-work/reports");
  readonly leavesLink = () => this.sidebarLink("/my-work/leaves");
  readonly approvalsLink = () => this.sidebarLink("/my-work/approvals");
  readonly timelineLink = () => this.sidebarLink("/my-work/timeline");

  // Communication (My Work workspace)
  readonly announcementsLink = () => this.sidebarLink("/my-work/announcements");
  readonly eventsLink = () => this.sidebarLink("/my-work/events");
  readonly circularsLink = () => this.sidebarLink("/my-work/circulars");
  readonly pollsLink = () => this.sidebarLink("/my-work/polls");

  // Administration workspace
  readonly staffLink = () => this.sidebarLink("/admin/staff");
  readonly expensesLink = () => this.sidebarLink("/my-work/expenses");
  readonly purchasesLink = () => this.sidebarLink("/operations/procurement");
  readonly accountsLink = () => this.sidebarLink("/operations/accounts");
  readonly bookingsLink = () => this.sidebarLink("/operations/bookings");
  readonly assetsLink = () => this.sidebarLink("/operations/assets");
  readonly settingsLink = () => this.sidebarLink("/my-work/settings");
  readonly nfcCardsLink = () => this.sidebarLink("/admin/hardware");
  readonly marketplaceLink = () => this.sidebarLink("/admin/marketplace");

  // School workspace
  readonly academicDashboardLink = () => this.sidebarLink("/school");
  readonly examinationsLink = () => this.sidebarLink("/school/examinations");
  readonly studentsLink = () => this.sidebarLink("/school/students");
  readonly classesLink = () => this.sidebarLink("/school/classes");
  readonly academicYearsLink = () => this.sidebarLink("/school/academic-years");

  // Operations & My Work services
  readonly helpDeskLink = () => this.sidebarLink("/operations/facilities");
  readonly vehiclesLink = () => this.sidebarLink("/operations/fleet");
  readonly canteenLink = () => this.sidebarLink("/my-work/canteen");
  readonly visitorsLink = () => this.sidebarLink("/operations/visitors");
  readonly grievancesLink = () => this.sidebarLink("/my-work/grievances");
  readonly recognitionLink = () => this.sidebarLink("/my-work/recognition");
  readonly availabilityLink = () => this.sidebarLink("/my-work/availability");
  readonly mediaLink = () => this.sidebarLink("/operations/media-library");

  // ========== Dashboard Action Elements ==========
  
  // Finance Dashboard
  financeNewRequestButton = () => this.page.locator('button:has-text("New Request")').first();
  financeExportButton = () => this.page.locator('button:has-text("Export")').first();
  financeApprovalQueue = () => this.page.locator('text=Finance Approvals Engine').first();

  // Alumni Portal
  alumniTabs = () => this.page.locator('[role="tablist"]');
  alumniMentorTab = () => this.page.locator('[role="tab"]:has-text("AI Mentor Match")');
  alumniJobsTab = () => this.page.locator('[role="tab"]:has-text("Job Board")');
  alumniEndowmentsTab = () => this.page.locator('[role="tab"]:has-text("Endowments")');
  alumniEventsTab = () => this.page.locator('[role="tab"]:has-text("Homecoming & Events")');
  alumniApplyButton = (jobTitle: string) => this.page.locator(`button:has-text("Apply with 1-Click")`).first();

  // Supply Cockpit
  supplyNewRequisitionButton = () => this.page.locator('button:has-text("New Requisition")').first();
  supplyRefreshButton = () => this.page.locator('button:has-text("Refresh")').first();
  supplyTabs = () => this.page.locator('[role="tablist"]');
  supplyReconciliationTab = () => this.page.locator('[role="tab"]:has-text("3-Way Matching")');
  supplyOrdersTab = () => this.page.locator('[role="tab"]:has-text("Purchase Orders")');
  supplyVendorsTab = () => this.page.locator('[role="tab"]:has-text("Vendor Directory")');

  // Vision Shield
  visionTabs = () => this.page.locator('[role="tablist"]');
  visionRadarTab = () => this.page.locator('[role="tab"]:has-text("3D Vision Radar")');
  visionThreatsTab = () => this.page.locator('[role="tab"]:has-text("Threat Alerts & Incidents")');
  visionGuardsTab = () => this.page.locator('[role="tab"]:has-text("Guard Dispatch")');
  visionAlprTab = () => this.page.locator('[role="tab"]:has-text("ALPR & Gate Access")');
  visionPrivacyTab = () => this.page.locator('[role="tab"]:has-text("Privacy Vault")');
  visionLockdownButton = () => this.page.locator('button:has-text("LOCKDOWN")').first();

  // Facility Mind
  facilityTabs = () => this.page.locator('[role="tablist"]');
  facilityEquipmentTab = () => this.page.locator('[role="tab"]:has-text("Equipment Studio & Twin")');
  facilityPredictiveTab = () => this.page.locator('[role="tab"]:has-text("Predictive Matrix")');
  facilityWorkOrdersTab = () => this.page.locator('[role="tab"]:has-text("Work Order Radar")');
  facilityInventoryTab = () => this.page.locator('[role="tab"]:has-text("Parts Inventory")');
  facilityEnergyTab = () => this.page.locator('[role="tab"]:has-text("Energy & Load Shed")');

  // Portal Pages
  facilitiesDiscoveryCanvas = () => this.page.locator('text=Campus Space Discovery').first();
  feesPortalHeader = () => this.page.locator('text=Student Fee & Online Payment Portal').first();
  feesPayButton = () => this.page.locator('button:has-text("Pay")').first();
  documentsPortalHeader = () => this.page.locator('text=Student & Parent Document Center').first();

  // Main Dashboard
  dashboardStaffPresentCard = () => this.page.locator('text=Staff Present').first();
  dashboardProfileCompletionCard = () => this.page.locator('text=Profile Completion').first();
  dashboardPendingApprovalsCard = () => this.page.locator('text=Pending Approvals').first();

  // ========== Assertion Helpers ==========

  async expectSidebarLinkVisible(href: string, shouldBeVisible: boolean = true) {
    const link = this.sidebarLink(href);
    if (shouldBeVisible) {
      await expect(link).toBeVisible({ timeout: 10000 });
    } else {
      await expect(link).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectSidebarLinkVisibleByLabel(label: string, shouldBeVisible: boolean = true) {
    const link = this.sidebarLinkByLabel(label);
    if (shouldBeVisible) {
      await expect(link).toBeVisible({ timeout: 10000 });
    } else {
      await expect(link).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectBottomNavLinkVisible(href: string, shouldBeVisible: boolean = true) {
    const link = this.bottomNavLink(href);
    if (shouldBeVisible) {
      await expect(link).toBeVisible({ timeout: 10000 });
    } else {
      await expect(link).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Finance Dashboard assertions
  async expectFinanceDashboardLoaded() {
    await expect(this.financeApprovalQueue()).toBeVisible({ timeout: 10000 });
  }

  async expectFinanceNewRequestVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.financeNewRequestButton()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.financeNewRequestButton()).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectFinanceExportVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.financeExportButton()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.financeExportButton()).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Alumni Portal assertions
  async expectAlumniPortalLoaded() {
    await expect(this.page.locator('h1:has-text("Alumni & Career Advancement Portal")').first()).toBeVisible({ timeout: 10000 });
  }

  async expectAlumniTabVisible(tabName: string, shouldBeVisible: boolean = true) {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
    if (shouldBeVisible) {
      await expect(tab).toBeVisible({ timeout: 5000 });
    } else {
      await expect(tab).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Supply Cockpit assertions
  async expectSupplyCockpitLoaded() {
    await expect(this.page.locator('h1:has-text("SUPPLY-HIVE")').first()).toBeVisible({ timeout: 10000 });
  }

  async expectSupplyTabVisible(tabName: string, shouldBeVisible: boolean = true) {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
    if (shouldBeVisible) {
      await expect(tab).toBeVisible({ timeout: 5000 });
    } else {
      await expect(tab).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectSupplyNewRequisitionVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.supplyNewRequisitionButton()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.supplyNewRequisitionButton()).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Vision Shield assertions
  async expectVisionShieldLoaded() {
    await expect(this.page.locator('h1:has-text("Autonomous Campus Safety")').first()).toBeVisible({ timeout: 10000 });
  }

  async expectVisionTabVisible(tabName: string, shouldBeVisible: boolean = true) {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
    if (shouldBeVisible) {
      await expect(tab).toBeVisible({ timeout: 5000 });
    } else {
      await expect(tab).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectVisionLockdownVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.visionLockdownButton()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.visionLockdownButton()).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Facility Mind assertions
  async expectFacilityMindLoaded() {
    await expect(this.page.locator('h1:has-text("FACILITY-MIND")').first()).toBeVisible({ timeout: 10000 });
  }

  async expectFacilityTabVisible(tabName: string, shouldBeVisible: boolean = true) {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
    if (shouldBeVisible) {
      await expect(tab).toBeVisible({ timeout: 5000 });
    } else {
      await expect(tab).not.toBeVisible({ timeout: 5000 });
    }
  }

  // Portal assertions
  async expectFacilitiesPortalLoaded() {
    await expect(this.facilitiesDiscoveryCanvas()).toBeVisible({ timeout: 10000 });
  }

  async expectFeesPortalLoaded() {
    await expect(this.feesPortalHeader()).toBeVisible({ timeout: 10000 });
  }

  async expectDocumentsPortalLoaded() {
    await expect(this.documentsPortalHeader()).toBeVisible({ timeout: 10000 });
  }

  // Main Dashboard assertions
  async expectDashboardLoaded() {
    await expect(this.sidebarNav).toBeVisible({ timeout: 10000 });
  }

  async expectDashboardStaffPresentCardVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.dashboardStaffPresentCard()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.dashboardStaffPresentCard()).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectDashboardProfileCompletionCardVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.dashboardProfileCompletionCard()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.dashboardProfileCompletionCard()).not.toBeVisible({ timeout: 5000 });
    }
  }

  async expectDashboardPendingApprovalsCardVisible(shouldBeVisible: boolean = true) {
    if (shouldBeVisible) {
      await expect(this.dashboardPendingApprovalsCard()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.dashboardPendingApprovalsCard()).not.toBeVisible({ timeout: 5000 });
    }
  }

  // ========== Forbidden API Call Helpers ==========

  async callApiAndExpectForbidden(url: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: any) {
    const response = await this.page.request.fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      data: body ? JSON.stringify(body) : undefined,
    });
    
    expect(response.status()).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/forbidden/i);
    return json;
  }
}

// ========== Navigation Visibility Matrix ==========
//
// Phase 1.5: keys are canonical workspace URLs. Visibility = workspace
// availability for the role (requiredRoles in config/navigation.ts) AND the
// item's PermissionGate (roles/permission) in navigation.ts.

export const NAV_VISIBILITY_MATRIX: Record<string, Record<string, boolean>> = {
  // My Work (workspace available to every role)
  "/my-work/attendance": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/tasks": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/reports": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/leaves": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/approvals": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/my-work/timeline": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/announcements": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/events": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/circulars": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/polls": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/expenses": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/canteen": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/complaints": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/recognition": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/my-work/availability": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },

  // School (workspace: super_admin, admin, principal, hod)
  "/school": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/school/students": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/school/classes": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/school/examinations": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/school/academic-years": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },

  // Operations (workspace: super_admin, admin, principal, accounts, purchase — no hod/staff)
  "/operations/finance": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: false },
  "/operations/fleet": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },
  "/operations/assets": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: true },
  "/operations/procurement": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: true },
  "/operations/facilities": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: true },
  "/operations/bookings": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: true },
  "/operations/accounts": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: false },
  "/operations/finance-audit": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: true, purchase: false },
  "/operations/finance-requests": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: false },
  "/operations/visitors": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },
  "/operations/media-library": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },

  // Administration (workspace: super_admin, admin only)
  "/admin/staff": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },
  "/admin/marketplace": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },
  "/admin/hardware": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },
};

/** Workspace label that owns each matrix key (used to drive the switcher). */
export const NAV_WORKSPACE: Record<string, string> = Object.fromEntries(
  Object.keys(NAV_VISIBILITY_MATRIX).map((href) => [
    href,
    href.startsWith("/school")
      ? "Academics"
      : href.startsWith("/operations")
        ? "Operations"
        : href.startsWith("/admin")
          ? "Admin"
          : "My Space",
  ])
);

// Dashboard action visibility matrix
export const DASHBOARD_ACTION_VISIBILITY: Record<string, Record<string, boolean>> = {
  // Finance Dashboard
  "finance:new-request": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "finance:export": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: false },

  // Alumni Portal
  "alumni:mentors": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "alumni:jobs": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "alumni:endowments": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: false },
  "alumni:events": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },

  // Supply Cockpit
  "supply:new-requisition": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "supply:reconciliation": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: true, purchase: true },
  "supply:orders": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: true, purchase: true },
  "supply:vendors": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: true, purchase: true },

  // Vision Shield
  "vision:radar": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "vision:threats": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "vision:guards": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "vision:alpr": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "vision:privacy": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },
  "vision:lockdown": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },

  // Facility Mind
  "facility:equipment": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "facility:predictive": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:workorders": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "facility:inventory": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },
  "facility:energy": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },
  "facility:dispatch": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },

  // Portal Pages
  "facilities:spaces": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "fees:view": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "fees:pay": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "documents:read": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },

  // Main Dashboard
  "dashboard:staff-present": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "dashboard:profile-completion": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "dashboard:pending-approvals": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
};