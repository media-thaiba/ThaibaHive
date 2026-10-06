import {
  Clock, CheckSquare, FileText, Calendar, ThumbsUp, Activity,
  CalendarCheck, Briefcase, Settings, Truck, Coffee,
  ShoppingCart,
  Award, LayoutDashboard,
  ClipboardCheck,
  GraduationCap, Users as UsersIcon, Layers, CalendarDays,
  Smartphone, Bot, Landmark, Percent, Wallet, Scale,
  Shield, Wrench, Database, Key,
  type LucideIcon,
} from "lucide-react";

import type { StaffRole } from "@thaiba/auth/roles";

export type { StaffRole };

export type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  permission?: string;
  anyOf?: string[];
  roles?: StaffRole[];
  workspace?: WorkspaceId;
};

export type WorkspaceId = "my-work" | "school" | "operations" | "admin";

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type WorkspaceConfig = {
  id: WorkspaceId;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
  requiredRoles?: StaffRole[];
  order: number;
};

export const workspaces: WorkspaceConfig[] = [
  {
    id: "my-work",
    label: "My Work",
    icon: LayoutDashboard,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Your personal dashboard, tasks, leaves, reports & approvals",
    order: 1,
  },
  {
    id: "school",
    label: "School",
    icon: GraduationCap,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "Academics: students, classes, exams, grading & hall tickets",
    requiredRoles: ["teacher", "hod", "principal", "admin", "super_admin", "coordinator", "exam_coordinator"],
    order: 2,
  },
  {
    id: "operations",
    label: "Operations",
    icon: Briefcase,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Finance, fleet, assets, procurement, reconciliation & payroll",
    requiredRoles: ["purchase", "accounts", "principal", "admin", "super_admin", "regional_admin"],
    order: 3,
  },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    description: "Agents, hardware, audit ledgers, tenant settings & security",
    requiredRoles: ["admin", "super_admin", "regional_admin", "regional_auditor"],
    order: 4,
  },
];

export const getWorkspaceById = (id: WorkspaceId): WorkspaceConfig | undefined =>
  workspaces.find((w) => w.id === id);

export const getWorkspacesForRole = (role: StaffRole): WorkspaceConfig[] =>
  workspaces.filter((w) => w.requiredRoles?.includes(role) ?? true).sort((a, b) => a.order - b.order);

// --- My Work ---
const myWorkItems: NavItem[] = [
  { href: "/my-work", label: "Dashboard", desc: "Your personal overview with today's schedule & quick actions", icon: LayoutDashboard, workspace: "my-work" },
  { href: "/my-work/attendance", label: "Attendance", desc: "View your daily attendance history, punch logs & percentage", icon: Clock, workspace: "my-work" },
  { href: "/my-work/tasks", label: "Tasks", desc: "View and manage your assigned tasks on a drag-and-drop board", icon: CheckSquare, workspace: "my-work" },
  { href: "/my-work/leaves", label: "Leaves", desc: "Apply for leave, check balance & track approval status", icon: Calendar, workspace: "my-work" },
  { href: "/my-work/reports", label: "Reports", desc: "Submit daily work reports and view team summaries", icon: FileText, workspace: "my-work" },
  { href: "/my-work/approvals", label: "Approvals", desc: "Review and approve pending requests from your team", icon: ThumbsUp, permission: "approvals:approve", workspace: "my-work", roles: ["hod", "principal", "admin", "super_admin"] },
  { href: "/my-work/canteen", label: "Canteen", desc: "Pre-order meals, view menu & manage meal preferences", icon: Coffee, workspace: "my-work" },
  { href: "/my-work/timeline", label: "Timeline", desc: "See recent activity across your department", icon: Activity, workspace: "my-work" },
];

// --- School ---
const schoolItems: NavItem[] = [
  { href: "/school", label: "Academic Dashboard", desc: "Overview of students, classes, attendance & academic health", icon: GraduationCap, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin", "coordinator", "exam_coordinator"] },
  { href: "/school/students", label: "Students", desc: "Manage student records, profiles, guardians & enrollment", icon: UsersIcon, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin", "coordinator"] },
  { href: "/school/classes", label: "Classes", desc: "Manage class sections, rosters, timetables & syllabus", icon: Layers, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin", "coordinator"] },
  { href: "/school/examinations", label: "Examinations", desc: "Manage exam sessions, hall tickets, grading & tabulation registers", icon: GraduationCap, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin", "exam_coordinator"] },
  { href: "/school/academic-years", label: "Academic Years", desc: "Configure academic year periods, terms & holidays", icon: CalendarDays, workspace: "school", roles: ["principal", "admin", "super_admin", "coordinator"] },
  { href: "/school/timetable", label: "Timetable", desc: "View and manage class timetables & teacher assignments", icon: CalendarCheck, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin"] },
  { href: "/school/attendance", label: "Student Attendance", desc: "Mark and view student daily attendance", icon: ClipboardCheck, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin"] },
  { href: "/school/grades", label: "Grades & Report Cards", desc: "Enter marks, compute ranks & generate report cards", icon: Award, workspace: "school", roles: ["teacher", "hod", "principal", "admin", "super_admin", "exam_coordinator"] },
];

// --- Operations ---
const operationsItems: NavItem[] = [
  { href: "/operations", label: "Operations Dashboard", desc: "Unified view of finance, fleet, assets & procurement", icon: LayoutDashboard, workspace: "operations", roles: ["purchase", "accounts", "principal", "admin", "super_admin", "regional_admin"] },
  { href: "/operations/finance", label: "Finance Dashboard", desc: "Revenue, receivables, fee collection & institutional finance", icon: Landmark, permission: "finance:read", workspace: "operations", roles: ["accounts", "admin", "super_admin", "principal"] },
  { href: "/operations/finance/tax", label: "Tax Rates", desc: "Jurisdiction tax rates, institution overrides & calculators", icon: Percent, permission: "finance:tax:view", workspace: "operations", roles: ["accounts", "admin", "super_admin"] },
  { href: "/operations/finance/purchases", label: "Purchase Approvals", desc: "Multi-stage purchase approvals with Merkle audit verification", icon: ShoppingCart, anyOf: ["finance:purchases:create", "finance:purchases:approve:tier1", "finance:purchases:approve:tier2", "finance:purchases:approve:final"], workspace: "operations", roles: ["purchase", "accounts", "principal", "admin", "super_admin"] },
  { href: "/operations/finance/payroll", label: "Payroll", desc: "Salary structures, period generation & disbursement tracking", icon: Wallet, permission: "finance:payroll:view", workspace: "operations", roles: ["accounts", "admin", "super_admin"] },
  { href: "/operations/finance/reconciliation", label: "3-Way Reconciliation", desc: "Bank reconciliation across fee, expense & bank ledgers", icon: Scale, permission: "finance:reconciliation:view", workspace: "operations", roles: ["accounts", "admin", "super_admin"] },
  { href: "/operations/fleet", label: "Fleet Management", desc: "Vehicles, maintenance schedules, fuel tracking & transport routes", icon: Truck, workspace: "operations", roles: ["admin", "super_admin", "principal", "hod"] },
  { href: "/operations/assets", label: "Asset Tracking", desc: "Institutional assets, equipment assignments & lifecycle", icon: Briefcase, workspace: "operations", roles: ["admin", "super_admin", "principal", "hod", "staff", "purchase"] },
  { href: "/operations/procurement", label: "Procurement", desc: "Purchase requests, vendor management & approval workflows", icon: ShoppingCart, workspace: "operations", roles: ["purchase", "accounts", "admin", "super_admin", "principal"] },
  { href: "/operations/facilities", label: "Facilities", desc: "Help desk, room bookings, maintenance & vendor contracts", icon: Wrench, workspace: "operations", roles: ["admin", "super_admin", "principal", "hod", "staff", "accounts", "purchase"] },
];

// --- Administration ---
const adminItems: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard", desc: "System health, telemetry & cross-institutional overview", icon: LayoutDashboard, workspace: "admin", roles: ["admin", "super_admin", "regional_admin", "regional_auditor"] },
  { href: "/admin/agents", label: "Agent Cockpit", desc: "Autonomous multi-agent workflows, guardrails, kill-switch & telemetry", icon: Bot, permission: "agent:workflows:view", workspace: "admin", roles: ["admin", "super_admin", "regional_admin", "regional_auditor"] },
  { href: "/admin/hardware", label: "Hardware Management", desc: "NFC cards, biometric terminals, beacons & QR locations", icon: Smartphone, workspace: "admin", roles: ["admin", "super_admin"] },
  { href: "/admin/audit", label: "Audit Ledgers", desc: "Merkle audit trails, tamper-proof logs & compliance forensics", icon: Database, permission: "admin:audit", workspace: "admin", roles: ["admin", "super_admin", "regional_auditor"] },
  { href: "/admin/tenant", label: "Tenant Settings", desc: "Institution config, branding, feature flags & integrations", icon: Settings, permission: "admin:all", workspace: "admin", roles: ["admin", "super_admin", "regional_admin"] },
  { href: "/admin/security", label: "Security Center", desc: "Zero-trust policies, certificates, devices & threat intel", icon: Shield, permission: "system:security:view", workspace: "admin", roles: ["admin", "super_admin", "regional_admin", "regional_auditor"] },
  { href: "/admin/keys", label: "Key Management", desc: "Encryption keys, rotation policies & HSM integration", icon: Key, permission: "system:admin", workspace: "admin", roles: ["super_admin"] },
];

export const workspaceNavMap: Record<WorkspaceId, NavItem[]> = {
  "my-work": myWorkItems,
  "school": schoolItems,
  "operations": operationsItems,
  "admin": adminItems,
};

// Flattened for backward compatibility
export const navGroups = [
  { label: "My Work", items: myWorkItems },
  { label: "School", items: schoolItems },
  { label: "Operations", items: operationsItems },
  { label: "Administration", items: adminItems },
];

export const primaryNav = myWorkItems.slice(0, 4);

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

const ENABLED_PATHS = new Set([
  ...allNavItems.map((item) => item.href),
  "/",
  "/my-work",
  "/school",
  "/operations",
  "/admin",
  "/reports",
  "/expenses",
  "/purchases",
  "/accounts",
  "/vehicles",
  "/visitors",
  "/grievances",
  "/recognition",
  "/availability",
  "/timeline",
  "/examinations",
  "/academic/timetable",
  "/academic/academic-years",
  "/admin",
  "/media-library",
  "/api/media",
]);

export function isPhaseOnePath(href: string): boolean {
  if (href.startsWith("/api/media")) return true;
  return ENABLED_PATHS.has(href) || allNavItems.some((item) => item.href === href);
}

export function searchNav(query: string): NavItem[] {
  const q = query.toLowerCase();
  return allNavItems.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.href.toLowerCase().includes(q)
  );
}

export function getItemsForWorkspace(workspaceId: WorkspaceId): NavItem[] {
  return workspaceNavMap[workspaceId] ?? [];
}

export function getWorkspaceForPath(path: string): WorkspaceId | null {
  if (path.startsWith("/my-work")) return "my-work";
  if (path.startsWith("/school")) return "school";
  if (path.startsWith("/operations")) return "operations";
  if (path.startsWith("/admin")) return "admin";
  // Default fallback based on common paths
  if (path.startsWith("/attendance") || path.startsWith("/tasks") || path.startsWith("/leaves") || path.startsWith("/reports") || path.startsWith("/approvals") || path.startsWith("/canteen")) return "my-work";
  if (path.startsWith("/examinations") || path.startsWith("/academic") || path.startsWith("/students") || path.startsWith("/classes") || path.startsWith("/timetable")) return "school";
  if (path.startsWith("/finance") || path.startsWith("/fleet") || path.startsWith("/assets") || path.startsWith("/procurement") || path.startsWith("/facilities")) return "operations";
  if (path.startsWith("/admin")) return "admin";
  return "my-work";
}