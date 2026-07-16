import {
  Clock, CheckSquare, FileText, Calendar, ThumbsUp, Activity,
  Megaphone, Sparkles, BarChart3, Users, DollarSign, ShoppingCart,
  CalendarCheck, Briefcase, Settings, HelpCircle, Truck, Coffee,
  DoorOpen, MessageSquare, Award, CircleDot, LayoutDashboard,
  Store,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Daily Work",
    items: [
      { href: "/attendance", label: "Attendance", desc: "View your daily attendance history and logs", icon: Clock },
      { href: "/tasks", label: "Tasks", desc: "View and manage your assigned tasks on a drag-and-drop board", icon: CheckSquare },
      { href: "/reports", label: "Reports", desc: "Submit daily work reports and view team summaries", icon: FileText },
      { href: "/leaves", label: "Leaves", desc: "Apply for leave and track approval status", icon: Calendar },
      { href: "/approvals", label: "Approvals", desc: "Review and approve pending requests from your team", icon: ThumbsUp },
      { href: "/timeline", label: "Timeline", desc: "See recent activity across your department", icon: Activity },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/announcements", label: "Announcements", desc: "View official notices and important updates from admin", icon: Megaphone },
      { href: "/events", label: "Events", desc: "See upcoming institutional events and RSVP", icon: Sparkles },
      { href: "/circulars", label: "Circulars", desc: "Access official circulars and policy documents", icon: FileText },
      { href: "/polls", label: "Polls", desc: "Participate in quick surveys and decision polls", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff", label: "Staff Directory", desc: "Browse employee profiles and contact information", icon: Users },
      { href: "/expenses", label: "Expenses", desc: "Submit expense claims and track reimbursement status", icon: DollarSign },
      { href: "/purchases", label: "Purchases", desc: "Request purchases and track procurement status", icon: ShoppingCart },
      { href: "/accounts", label: "Accounts", desc: "View department income, expenses, and financial summaries", icon: FileText },
      { href: "/bookings", label: "Bookings", desc: "Reserve rooms, equipment, or shared resources", icon: CalendarCheck },
      { href: "/assets", label: "Assets", desc: "Track institutional assets and equipment assignments", icon: Briefcase },
      { href: "/settings", label: "Settings", desc: "Update your profile, password, and notification preferences", icon: Settings },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/help-desk", label: "Help Desk", desc: "Create IT support tickets and track resolution progress", icon: HelpCircle },
      { href: "/vehicles", label: "Vehicles", desc: "Book institutional vehicles and view fleet status", icon: Truck },
      { href: "/canteen", label: "Canteen", desc: "View daily menu and submit meal preferences", icon: Coffee },
      { href: "/visitors", label: "Visitors", desc: "Pre-register visitors and manage visitor check-in", icon: DoorOpen },
      { href: "/grievances", label: "Feedback", desc: "Submit suggestions, concerns, or anonymous feedback", icon: MessageSquare },
      { href: "/recognition", label: "Recognition", desc: "Send kudos to colleagues and view birthday reminders", icon: Award },
      { href: "/availability", label: "Availability", desc: "Set your availability status for team visibility", icon: CircleDot },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/marketplace", label: "App Store", desc: "Browse and install workspace extensions", icon: Store },
    ],
  },
];

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", desc: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", desc: "Attendance history & check-out", icon: Clock },
  { href: "/tasks", label: "Tasks", desc: "Kanban board", icon: CheckSquare },
  { href: "/leaves", label: "Leaves", desc: "Leave requests", icon: Calendar },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function isPhaseOnePath(): boolean {
  return true;
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
