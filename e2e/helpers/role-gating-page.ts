import { type Page, type Locator, expect } from "@playwright/test";
import { E2E_ROLES } from "./auth-helper";

export { E2E_ROLES };

export class RoleGatingPage {
  readonly page: Page;
  readonly sidebarNav: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarNav = page.locator('nav[aria-label="Sidebar navigation"]');
    this.bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
  }

  // ========== Sidebar Navigation ==========
  sidebarLink(href: string): Locator {
    return this.sidebarNav.locator(`a[href="${href}"]`).first();
  }

  sidebarLinkByLabel(label: string): Locator {
    return this.sidebarNav.locator(`a:has-text("${label}")`).first();
  }

  // ========== Bottom Navigation ==========
  bottomNavLink(href: string): Locator {
    return this.bottomNav.locator(`a[href="${href}"]`).first();
  }

  // ========== Navigation Groups ==========
  // Daily Work
  readonly attendanceLink = () => this.sidebarLink("/attendance");
  readonly tasksLink = () => this.sidebarLink("/tasks");
  readonly reportsLink = () => this.sidebarLink("/reports");
  readonly leavesLink = () => this.sidebarLink("/leaves");
  readonly approvalsLink = () => this.sidebarLink("/approvals");
  readonly timelineLink = () => this.sidebarLink("/timeline");

  // Communication
  readonly announcementsLink = () => this.sidebarLink("/announcements");
  readonly eventsLink = () => this.sidebarLink("/events");
  readonly circularsLink = () => this.sidebarLink("/circulars");
  readonly pollsLink = () => this.sidebarLink("/polls");

  // Administration
  readonly staffLink = () => this.sidebarLink("/staff");
  readonly expensesLink = () => this.sidebarLink("/expenses");
  readonly purchasesLink = () => this.sidebarLink("/purchases");
  readonly accountsLink = () => this.sidebarLink("/accounts");
  readonly bookingsLink = () => this.sidebarLink("/bookings");
  readonly assetsLink = () => this.sidebarLink("/assets");
  readonly reviewsLink = () => this.sidebarLink("/reviews");
  readonly settingsLink = () => this.sidebarLink("/settings");
  readonly nfcCardsLink = () => this.sidebarLink("/admin/nfc");
  readonly executiveAnalyticsLink = () => this.sidebarLink("/admin/executive/analytics");

  // Academics
  readonly academicDashboardLink = () => this.sidebarLink("/academic");
  readonly examinationsLink = () => this.sidebarLink("/examinations");
  readonly studentsLink = () => this.sidebarLink("/academic/students");
  readonly classesLink = () => this.sidebarLink("/academic/classes");
  readonly academicYearsLink = () => this.sidebarLink("/academic/academic-years");

  // Services
  readonly helpDeskLink = () => this.sidebarLink("/help-desk");
  readonly vehiclesLink = () => this.sidebarLink("/vehicles");
  readonly canteenLink = () => this.sidebarLink("/canteen");
  readonly visitorsLink = () => this.sidebarLink("/visitors");
  readonly grievancesLink = () => this.sidebarLink("/grievances");
  readonly recognitionLink = () => this.sidebarLink("/recognition");
  readonly availabilityLink = () => this.sidebarLink("/availability");
  readonly mediaLink = () => this.sidebarLink("/media");

  // Marketplace
  readonly marketplaceLink = () => this.sidebarLink("/marketplace");

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
    await expect(this.page.locator('text=Alumni & Career Advancement Portal')).toBeVisible({ timeout: 10000 });
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
    await expect(this.page.locator('text=SUPPLY-HIVE')).toBeVisible({ timeout: 10000 });
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
    await expect(this.page.locator('text=Autonomous Campus Safety')).toBeVisible({ timeout: 10000 });
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
    await expect(this.page.locator('text=FACILITY-MIND')).toBeVisible({ timeout: 10000 });
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
    expect(json.error).toBe("Forbidden");
    return json;
  }
}

// ========== Navigation Visibility Matrix ==========

export const NAV_VISIBILITY_MATRIX: Record<string, Record<string, boolean>> = {
  // Daily Work
  "/attendance": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/tasks": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/reports": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/leaves": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/approvals": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/timeline": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },

  // Communication
  "/announcements": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/events": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/circulars": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/polls": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },

  // Administration
  "/staff": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/expenses": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/purchases": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "/accounts": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: true, purchase: false },
  "/bookings": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/assets": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "/reviews": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "/settings": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/admin/nfc": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },
  "/admin/executive/analytics": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },

  // Academics
  "/academic": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/examinations": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/academic/students": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/academic/classes": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "/academic/academic-years": { super_admin: true, admin: true, principal: true, hod: false, staff: false, accounts: false, purchase: false },

  // Services
  "/help-desk": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/vehicles": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/canteen": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/visitors": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/grievances": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/recognition": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/availability": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "/media": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },

  // Marketplace
  "/marketplace": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
};

// Dashboard action visibility matrix
export const DASHBOARD_ACTION_VISIBILITY: Record<string, Record<string, boolean>> = {
  // Finance Dashboard
  "finance:new-request": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: true, purchase: false },
  "finance:export": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: true, purchase: false },

  // Alumni Portal
  "alumni:mentors": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "alumni:jobs": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "alumni:endowments": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "alumni:events": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },

  // Supply Cockpit
  "supply:new-requisition": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "supply:reconciliation": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "supply:orders": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },
  "supply:vendors": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: true },

  // Vision Shield
  "vision:radar": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "vision:threats": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "vision:guards": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "vision:alpr": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "vision:privacy": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "vision:lockdown": { super_admin: true, admin: true, principal: false, hod: false, staff: false, accounts: false, purchase: false },

  // Facility Mind
  "facility:equipment": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:predictive": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:workorders": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:inventory": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:energy": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "facility:dispatch": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },

  // Portal Pages
  "facilities:spaces": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },
  "fees:view": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: false },
  "fees:pay": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: false },
  "documents:read": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: false, purchase: false },

  // Main Dashboard
  "dashboard:staff-present": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
  "dashboard:profile-completion": { super_admin: true, admin: true, principal: true, hod: true, staff: true, accounts: true, purchase: true },
  "dashboard:pending-approvals": { super_admin: true, admin: true, principal: true, hod: true, staff: false, accounts: false, purchase: false },
};