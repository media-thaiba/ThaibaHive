import type { CapabilityDefinition, CapabilityTier, ServiceCategory } from "./capability-schema";
import type { StaffRole } from "./roles";

/**
 * Single source of truth Capability Registry for ThaibaHive.
 * Drives routing, tier classification, offline synchronization, and UI actions.
 */
export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  // --- ATTENDANCE DOMAIN ---
  {
    id: "attendance.punch.create",
    label: "Punch Attendance",
    description: "Record daily clock-in and clock-out with biometric or GPS verification",
    tier: 1,
    offlineSupported: true,
    domain: "attendance",
    mobileRoute: "/today",
    webRoute: "/attendance",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "attendance",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase", "coordinator"],
  },
  {
    id: "attendance.record.view",
    label: "View Attendance History",
    description: "View personal monthly punch logs and attendance percentage",
    tier: 1,
    offlineSupported: true,
    domain: "attendance",
    mobileRoute: "/me/attendance",
    webRoute: "/attendance",
    requiresHandoff: false,
    serviceCategory: "attendance",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "attendance.shift.manage",
    label: "Manage Shifts & Timetables",
    description: "Configure employee shifts, grace times, and rotation calendars",
    tier: 3,
    offlineSupported: false,
    domain: "attendance",
    mobileRoute: null,
    webRoute: "/attendance",
    requiresHandoff: true,
    impliedRoles: ["principal", "admin", "super_admin"],
  },
  {
    id: "attendance.audit.review",
    label: "Audit Attendance Anomalies",
    description: "Review offline captured punches, clock drift exceptions, and biometric discrepancies",
    tier: 3,
    offlineSupported: false,
    domain: "attendance",
    mobileRoute: null,
    webRoute: "/attendance",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin", "principal"],
  },

  // --- LEAVES DOMAIN ---
  {
    id: "leave.request.create",
    label: "Apply for Leave",
    description: "Submit personal leave applications with dates and reason",
    tier: 1,
    offlineSupported: true,
    domain: "leaves",
    mobileRoute: "/me/leaves/apply",
    webRoute: "/leaves",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "leave",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "leave.request.view",
    label: "View Leave Balance & History",
    description: "Check leave balances (casual, medical, earned) and status of submitted leaves",
    tier: 1,
    offlineSupported: true,
    domain: "leaves",
    mobileRoute: "/me/leaves",
    webRoute: "/leaves",
    requiresHandoff: false,
    serviceCategory: "leave",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "leave.request.approve",
    label: "Approve Leave Requests",
    description: "Review and approve/reject pending leave applications from department staff",
    tier: 2,
    offlineSupported: false,
    domain: "leaves",
    mobileRoute: "/today",
    webRoute: "/approvals",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "leave",
    impliedRoles: ["hod", "principal", "admin", "super_admin", "institutional_head"],
  },
  {
    id: "leave.policy.manage",
    label: "Configure Leave Policies",
    description: "Set annual leave quotas, rollover rules, and restriction periods",
    tier: 3,
    offlineSupported: false,
    domain: "leaves",
    mobileRoute: null,
    webRoute: "/leaves",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin"],
  },

  // --- MEDIA DOMAIN ---
  {
    id: "media.asset.capture",
    label: "Capture Media",
    description: "Capture institutional event photos and videos using native mobile camera",
    tier: 1,
    offlineSupported: true,
    domain: "media",
    mobileRoute: "/media/capture",
    webRoute: "/media",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "media",
    impliedRoles: ["staff", "teacher", "coordinator", "admin", "super_admin"],
  },
  {
    id: "media.asset.upload",
    label: "Upload Media Outbox",
    description: "Queue compressed photos and videos for automated background upload",
    tier: 1,
    offlineSupported: true,
    domain: "media",
    mobileRoute: "/media/upload",
    webRoute: "/media",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "media",
    impliedRoles: ["staff", "teacher", "coordinator", "admin", "super_admin"],
  },
  {
    id: "media.asset.view",
    label: "View Media Gallery",
    description: "Browse thumbnails and event albums in the media feed",
    tier: 1,
    offlineSupported: true,
    domain: "media",
    mobileRoute: "/media",
    webRoute: "/media",
    requiresHandoff: false,
    serviceCategory: "media",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "media.album.manage",
    label: "Curate Media Albums & Metadata",
    description: "Create official folders, edit EXIF/tags, and manage publishing permissions",
    tier: 3,
    offlineSupported: false,
    domain: "media",
    mobileRoute: null,
    webRoute: "/media",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin"],
  },

  // --- COMMUNICATION & NOTICES ---
  {
    id: "notice.circular.view",
    label: "View Circulars & Broadcasts",
    description: "Read official school circulars and policy broadcasts",
    tier: 1,
    offlineSupported: true,
    domain: "communication",
    mobileRoute: "/today",
    webRoute: "/circulars",
    requiresHandoff: false,
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "notice.poll.vote",
    label: "Participate in Polls",
    description: "Cast quick votes in institutional decision polls",
    tier: 1,
    offlineSupported: false,
    domain: "communication",
    mobileRoute: "/services",
    webRoute: "/polls",
    requiresHandoff: false,
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "notice.circular.create",
    label: "Publish Circulars",
    description: "Author and dispatch targeted circulars with attachments to staff or parents",
    tier: 3,
    offlineSupported: false,
    domain: "communication",
    mobileRoute: null,
    webRoute: "/circulars",
    requiresHandoff: true,
    impliedRoles: ["principal", "admin", "super_admin", "coordinator"],
  },

  // --- SERVICES DOMAIN (Canteen, Helpdesk, Visitors, Bookings) ---
  {
    id: "canteen.order.create",
    label: "Order Canteen Meal",
    description: "Pre-order daily meals, lunches, and refreshments",
    tier: 1,
    offlineSupported: false,
    domain: "services",
    mobileRoute: "/services",
    webRoute: "/canteen",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "canteen",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "canteen.menu.manage",
    label: "Manage Canteen Menu & Orders",
    description: "Update daily menus, review orders, and monitor kitchen meal quotas",
    tier: 3,
    offlineSupported: false,
    domain: "services",
    mobileRoute: null,
    webRoute: "/canteen",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin"],
  },
  {
    id: "helpdesk.ticket.create",
    label: "Raise IT Helpdesk Ticket",
    description: "Submit IT, facility, or maintenance support requests with photos",
    tier: 1,
    offlineSupported: false,
    domain: "services",
    mobileRoute: "/services",
    webRoute: "/help-desk",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "helpdesk",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "visitor.pass.create",
    label: "Issue Visitor Gate Pass",
    description: "Pre-register campus visitors and generate digital QR entry passes",
    tier: 1,
    offlineSupported: false,
    domain: "services",
    mobileRoute: "/services",
    webRoute: "/visitors",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "gate-pass",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "booking.resource.create",
    label: "Book Campus Facility",
    description: "Reserve seminar halls, projectors, sports courts, and labs",
    tier: 1,
    offlineSupported: false,
    domain: "services",
    mobileRoute: "/services",
    webRoute: "/bookings",
    requiresHandoff: false,
    serviceCategory: "booking",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },

  // --- TASKS & REPORTS ---
  {
    id: "task.item.view",
    label: "View Assigned Tasks",
    description: "View daily personal tasks and toggle completion status",
    tier: 1,
    offlineSupported: true,
    domain: "tasks",
    mobileRoute: "/today",
    webRoute: "/tasks",
    requiresHandoff: false,
    serviceCategory: "tasks",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "report.daily.submit",
    label: "Submit Daily Work Report",
    description: "Submit daily duty summary log to department head",
    tier: 1,
    offlineSupported: true,
    domain: "tasks",
    mobileRoute: "/services",
    webRoute: "/reports",
    requiresHandoff: false,
    quickAction: true,
    serviceCategory: "tasks",
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },

  // --- ACADEMIC & SCHOOL ERP ---
  {
    id: "academic.student.directory",
    label: "Student Quick Contact Directory",
    description: "Quickly lookup student roll number, guardian contacts, and class assignment",
    tier: 2,
    offlineSupported: true,
    domain: "academic",
    mobileRoute: "/services",
    webRoute: "/academic/students",
    requiresHandoff: false,
    impliedRoles: ["teacher", "hod", "principal", "admin", "super_admin", "coordinator"],
  },
  {
    id: "academic.student.admissions",
    label: "Student Admissions Pipeline",
    description: "Manage multi-stage student admission applications, verification, and enrollment",
    tier: 3,
    offlineSupported: false,
    domain: "academic",
    mobileRoute: null,
    webRoute: "/academic/students",
    requiresHandoff: true,
    impliedRoles: ["principal", "admin", "super_admin"],
  },
  {
    id: "academic.classes.manage",
    label: "Class Sections & Timetable",
    description: "Manage class sections, syllabus maps, and teacher course assignments",
    tier: 3,
    offlineSupported: false,
    domain: "academic",
    mobileRoute: null,
    webRoute: "/academic/classes",
    requiresHandoff: true,
    impliedRoles: ["principal", "admin", "super_admin", "coordinator"],
  },
  {
    id: "exam.duty.view",
    label: "View Invigilation Duty Schedule",
    description: "Check assigned exam invigilation rooms, timings, and instructions",
    tier: 2,
    offlineSupported: true,
    domain: "academic",
    mobileRoute: "/today",
    webRoute: "/examinations",
    requiresHandoff: false,
    impliedRoles: ["teacher", "exam_coordinator", "hod", "principal", "admin", "super_admin"],
  },
  {
    id: "exam.marks.enter",
    label: "Examination Grade Entry & Tabulation",
    description: "Bulk grade entry, multi-subject tabulation registers, and rank computation",
    tier: 3,
    offlineSupported: false,
    domain: "academic",
    mobileRoute: null,
    webRoute: "/examinations",
    requiresHandoff: true,
    impliedRoles: ["teacher", "exam_coordinator", "hod", "principal", "admin", "super_admin"],
  },

  // --- FINANCE & OPERATIONS ---
  {
    id: "finance.purchase.approve",
    label: "Approve Purchase Requests",
    description: "Review procurement requisitions and approve multi-tier purchase orders",
    tier: 2,
    offlineSupported: false,
    domain: "finance",
    mobileRoute: "/today",
    webRoute: "/finance/purchases",
    requiresHandoff: false,
    quickAction: true,
    impliedRoles: ["purchase", "accounts", "principal", "admin", "super_admin"],
  },
  {
    id: "finance.expense.claim",
    label: "Submit Expense Claim",
    description: "Submit reimbursement claims with bill receipts for accounts verification",
    tier: 1,
    offlineSupported: false,
    domain: "finance",
    mobileRoute: "/services",
    webRoute: "/expenses",
    requiresHandoff: false,
    quickAction: true,
    impliedRoles: ["staff", "teacher", "hod", "principal", "admin", "super_admin", "accounts", "purchase"],
  },
  {
    id: "finance.reconciliation.manage",
    label: "3-Way Financial Reconciliation",
    description: "Reconcile student fee ledgers, bank statements, and expense accounts",
    tier: 3,
    offlineSupported: false,
    domain: "finance",
    mobileRoute: null,
    webRoute: "/finance/reconciliation",
    requiresHandoff: true,
    impliedRoles: ["accounts", "admin", "super_admin"],
  },
  {
    id: "finance.payroll.manage",
    label: "Payroll & Statutory Deductions",
    description: "Generate salary periods, calculate PF/PT/TDS, and authorize disbursements",
    tier: 3,
    offlineSupported: false,
    domain: "finance",
    mobileRoute: null,
    webRoute: "/finance/payroll",
    requiresHandoff: true,
    impliedRoles: ["accounts", "admin", "super_admin"],
  },
  {
    id: "operations.fleet.manage",
    label: "Vehicle & Fleet Operations",
    description: "Vehicle maintenance schedules, fuel tracking, and transport route mapping",
    tier: 3,
    offlineSupported: false,
    domain: "operations",
    mobileRoute: null,
    webRoute: "/vehicles",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin"],
  },

  // --- ADMINISTRATION & EXECUTIVE ---
  {
    id: "admin.agents.manage",
    label: "AI Multi-Agent Workflows",
    description: "Manage autonomous agents, Merkle audit ledgers, and emergency kill-switches",
    tier: 3,
    offlineSupported: false,
    domain: "admin",
    mobileRoute: null,
    webRoute: "/admin/agents",
    requiresHandoff: true,
    impliedRoles: ["super_admin", "admin"],
  },
  {
    id: "admin.hardware.nfc",
    label: "Biometric & NFC Hardware Management",
    description: "Enroll NFC staff badges, configure beacons, and manage biometric terminals",
    tier: 3,
    offlineSupported: false,
    domain: "admin",
    mobileRoute: null,
    webRoute: "/admin/nfc",
    requiresHandoff: true,
    impliedRoles: ["admin", "super_admin"],
  },
  {
    id: "admin.executive.analytics",
    label: "Executive Governance Analytics",
    description: "Institutional intelligence, cross-campus metrics, and compliance audits",
    tier: 3,
    offlineSupported: false,
    domain: "admin",
    mobileRoute: null,
    webRoute: "/admin/executive/analytics",
    requiresHandoff: true,
    impliedRoles: ["principal", "admin", "super_admin"],
  },
];

// --- HELPER LOOKUP MAPS ---
const capabilityMap = new Map<string, CapabilityDefinition>(
  CAPABILITY_REGISTRY.map((cap) => [cap.id, cap])
);

/**
 * Retrieve definition for a specific capability ID
 */
export function getCapability(id: string): CapabilityDefinition | undefined {
  return capabilityMap.get(id);
}

/**
 * Check if a capability is eligible for mobile exposure (Tier 1 or Tier 2)
 */
export function isMobileEligible(capabilityId: string): boolean {
  const cap = capabilityMap.get(capabilityId);
  return cap ? cap.tier === 1 || cap.tier === 2 : false;
}

/**
 * Check if triggering this capability on mobile requires Web Handoff (Tier 3)
 */
export function requiresWebHandoff(capabilityId: string): boolean {
  const cap = capabilityMap.get(capabilityId);
  return cap ? cap.tier === 3 || cap.requiresHandoff : false;
}

/**
 * Filter all capabilities by tier
 */
export function getCapabilitiesByTier(tier: CapabilityTier): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter((cap) => cap.tier === tier);
}

/**
 * Get Quick Action capabilities available for a set of user roles
 */
export function getQuickActions(roles: StaffRole[]): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter((cap) => {
    if (!cap.quickAction) return false;
    if (roles.includes("super_admin")) return true;
    return cap.impliedRoles?.some((r) => roles.includes(r)) ?? false;
  });
}

/**
 * Get capabilities for a specific service category
 */
export function getCapabilitiesForServiceCategory(category: ServiceCategory): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter((cap) => cap.serviceCategory === category);
}

/**
 * Granular capability evaluator
 */
export function can(userPermissions: string[] | Set<string>, requiredCapability: string): boolean {
  if (userPermissions instanceof Set) {
    if (userPermissions.has("*") || userPermissions.has(requiredCapability)) return true;
  } else if (Array.isArray(userPermissions)) {
    if (userPermissions.includes("*") || userPermissions.includes(requiredCapability)) return true;
  }
  return false;
}

/**
 * Multi-capability any-of evaluator
 */
export function canAny(userPermissions: string[] | Set<string>, requiredCapabilities: string[]): boolean {
  return requiredCapabilities.some((cap) => can(userPermissions, cap));
}
