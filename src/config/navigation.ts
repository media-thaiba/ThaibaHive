import {
  Clock, CheckSquare, FileText, Calendar, ThumbsUp, Activity,
  Megaphone, Sparkles, BarChart3, Users, DollarSign, ShoppingCart,
  CalendarCheck, Briefcase, Settings, HelpCircle, Truck, Coffee,
  DoorOpen, MessageSquare, Award, CircleDot, LayoutDashboard,
  Store, FolderOpen, ClipboardCheck,
  GraduationCap, Users as UsersIcon, Layers, CalendarDays,
  Smartphone, Bot,
  type LucideIcon,
} from "lucide-react";

export type StaffRole = "super_admin" | "admin" | "principal" | "hod" | "staff" | "accounts" | "purchase" | "regional_admin" | "regional_auditor";

export type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  permission?: string;
  anyOf?: string[];
  roles?: StaffRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Daily Work",
    items: [
      { href: "/attendance", label: "Attendance", desc: "View your daily attendance history and logs", icon: Clock, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/tasks", label: "Tasks", desc: "View and manage your assigned tasks on a drag-and-drop board", icon: CheckSquare, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/reports", label: "Reports", desc: "Submit daily work reports and view team summaries", icon: FileText, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/leaves", label: "Leaves", desc: "Apply for leave and track approval status", icon: Calendar, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/approvals", label: "Approvals", desc: "Review and approve pending requests from your team", icon: ThumbsUp, permission: "approvals:approve", roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/timeline", label: "Timeline", desc: "See recent activity across your department", icon: Activity, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/announcements", label: "Announcements", desc: "View official notices and important updates from admin", icon: Megaphone, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/events", label: "Events", desc: "See upcoming institutional events and RSVP", icon: Sparkles, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/circulars", label: "Circulars", desc: "Access official circulars and policy documents", icon: FileText, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/polls", label: "Polls", desc: "Participate in quick surveys and decision polls", icon: BarChart3, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff", label: "Staff Directory", desc: "Browse employee profiles and contact information", icon: Users, roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/expenses", label: "Expenses", desc: "Submit expense claims and track reimbursement status", icon: DollarSign, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/purchases", label: "Purchases", desc: "Request purchases and track procurement status", icon: ShoppingCart, roles: ["super_admin", "admin", "principal", "hod", "staff", "purchase"] },
      { href: "/accounts", label: "Accounts", desc: "View department income, expenses, and financial summaries", icon: FileText, roles: ["super_admin", "admin", "principal", "hod", "accounts"] },
      { href: "/bookings", label: "Bookings", desc: "Reserve rooms, equipment, or shared resources", icon: CalendarCheck, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/assets", label: "Assets", desc: "Track institutional assets and equipment assignments", icon: Briefcase, roles: ["super_admin", "admin", "principal", "hod", "staff", "purchase"] },
      { href: "/reviews", label: "Reviews", desc: "View performance reviews and submit self-evaluations", icon: ClipboardCheck, roles: ["super_admin", "admin", "principal", "hod", "staff"] },
      { href: "/settings", label: "Settings", desc: "Update your profile, password, and notification preferences", icon: Settings, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/admin/agents", label: "Agents Cockpit", desc: "Autonomous multi-agent workflows, safety guardrails & telemetry", icon: Bot, permission: "agent:workflows:view", roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase", "regional_admin", "regional_auditor"] },
      { href: "/admin/nfc", label: "NFC Cards", desc: "Manage NFC card inventory and assignments", icon: Smartphone, roles: ["super_admin", "admin"] },
      { href: "/admin/executive/analytics", label: "Executive Analytics", desc: "Unified governance, resilience, and mobile intelligence dashboard", icon: BarChart3, roles: ["super_admin", "admin"] },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/academic", label: "Academic Dashboard", desc: "Overview of students, classes, and attendance", icon: GraduationCap, roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/examinations", label: "Examinations", desc: "Manage examination sessions, hall tickets, and tabulation registers", icon: GraduationCap, roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/academic/students", label: "Students", desc: "Manage student records and profiles", icon: UsersIcon, roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/academic/classes", label: "Classes", desc: "Manage class sections and rosters", icon: Layers, roles: ["super_admin", "admin", "principal", "hod"] },
      { href: "/academic/academic-years", label: "Academic Years", desc: "Configure academic year periods", icon: CalendarDays, roles: ["super_admin", "admin", "principal"] },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/help-desk", label: "Help Desk", desc: "Create IT support tickets and track resolution progress", icon: HelpCircle, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/vehicles", label: "Vehicles", desc: "Book institutional vehicles and view fleet status", icon: Truck, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/canteen", label: "Canteen", desc: "View daily menu and submit meal preferences", icon: Coffee, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/visitors", label: "Visitors", desc: "Pre-register visitors and manage visitor check-in", icon: DoorOpen, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/grievances", label: "Feedback", desc: "Submit suggestions, concerns, or anonymous feedback", icon: MessageSquare, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/recognition", label: "Recognition", desc: "Send kudos to colleagues and view birthday reminders", icon: Award, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/availability", label: "Availability", desc: "Set your availability status for team visibility", icon: CircleDot, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
      { href: "/media", label: "Media Library", desc: "Browse, upload, and share institutional media assets", icon: FolderOpen, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/marketplace", label: "App Store", desc: "Browse and install workspace extensions", icon: Store, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
    ],
  },
];

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", desc: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
  { href: "/attendance", label: "Attendance", desc: "Attendance history & check-out", icon: Clock, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
  { href: "/tasks", label: "Tasks", desc: "Kanban board", icon: CheckSquare, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
  { href: "/leaves", label: "Leaves", desc: "Leave requests", icon: Calendar, roles: ["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"] },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

const ENABLED_PATHS = new Set([
  ...allNavItems.map((item) => item.href),
  "/",
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
