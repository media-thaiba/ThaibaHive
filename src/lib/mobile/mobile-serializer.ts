import {
  getCapability,
  getQuickActions,
  requiresWebHandoff,
  hasPermission,
} from "@thaiba/auth";

export interface MobileUserSummary {
  id: string;
  name: string;
  role: string;
  email: string;
  employeeId?: string | null;
  institutionId?: string | null;
}

export interface MobileDashboardPayload {
  user: MobileUserSummary;
  pendingApprovalsCount: number;
  upcomingExamsCount: number;
  unreadNotificationsCount: number;
  quickActions: string[];
  lastUpdated: string;
}

export interface MobileProfilePayload {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string | null;
  department?: string | null;
  institutionName?: string | null;
  activeStatus: boolean;
}

/**
 * Serializes user data into a minified mobile-friendly summary.
 */
export function serializeMobileUser(user: {
  id: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  employeeId?: string | null;
  institutionId?: string | null;
}): MobileUserSummary {
  const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  return {
    id: user.id,
    name,
    role: user.role,
    email: user.email,
    employeeId: user.employeeId ?? null,
    institutionId: user.institutionId ?? null,
  };
}

/**
 * Formats dashboard response for low-bandwidth mobile devices.
 */
export function serializeMobileDashboard(data: {
  user: MobileUserSummary;
  pendingApprovalsCount?: number;
  upcomingExamsCount?: number;
  unreadNotificationsCount?: number;
  quickActions?: string[];
}): MobileDashboardPayload {
  return {
    user: data.user,
    pendingApprovalsCount: data.pendingApprovalsCount ?? 0,
    upcomingExamsCount: data.upcomingExamsCount ?? 0,
    unreadNotificationsCount: data.unreadNotificationsCount ?? 0,
    quickActions: data.quickActions ?? ["finance_approvals", "attendance_checkin", "qr_verifier"],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Serializes staff profile payload for mobile settings / profile view.
 */
export function serializeMobileProfile(profile: {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string | null;
  department?: string | null;
  institutionName?: string | null;
  isActive?: boolean;
}): MobileProfilePayload {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    employeeId: profile.employeeId ?? null,
    department: profile.department ?? null,
    institutionName: profile.institutionName ?? null,
    activeStatus: profile.isActive ?? true,
  };
}

// ---------------------------------------------------------------------------
// Today Hub SDUI manifest (Phase 2 — D3)
// ---------------------------------------------------------------------------

export const TODAY_HUB_VERSION = 1;

/**
 * Static GoRouter paths registered in thaibahive_mobile_app/lib/app/router.dart.
 * Quick actions whose route is not in this allowlist are dropped by the
 * manifest builder (registry mobileRoute values are partly stale — D16*).
 * Dynamic-segment routes are intentionally excluded (quick actions never use them).
 */
export const MOBILE_ROUTES: ReadonlySet<string> = new Set([
  "/", "/accounts", "/admin", "/admin/beacons", "/admin/location-qr", "/admin/nfc-tags",
  "/agent-hub", "/announcements", "/approvals", "/assets", "/assets/tagging", "/attendance",
  "/auth/diagnostics", "/auth/login", "/auth/signup", "/availability", "/biometric/enrollment",
  "/bookings", "/bookings/create", "/canteen", "/checklists", "/circulars", "/events",
  "/expenses", "/finance", "/finance/approvals", "/finance/reconciliation", "/grievances",
  "/grievances/submit", "/help-desk", "/leaves", "/leaves/apply", "/leaves/balance", "/me",
  "/me/attendance", "/me/leaves", "/me/leaves/apply", "/me/leaves/balance", "/media", "/polls",
  "/purchases", "/recognition", "/reports", "/reports/create", "/services", "/settings",
  "/settings/diagnostics", "/settings/password", "/settings/profile", "/staff", "/tasks",
  "/tasks/create", "/technician/scan", "/technician/workorders", "/timeline", "/today",
  "/vehicles", "/visitors", "/visitors/gate-verify",
]);

/** Curated first-page order — the 4 quick actions the Today screen ships today. */
const CURATED_QUICK_ACTION_ORDER = [
  "canteen.order.create",
  "helpdesk.ticket.create",
  "booking.resource.create",
  "visitor.pass.create",
];

/** Curated ids get specific screens instead of the generic /services registry route. */
const CURATED_ROUTES: Record<string, string> = {
  "canteen.order.create": "/canteen",
  "helpdesk.ticket.create": "/help-desk",
  "booking.resource.create": "/bookings/create",
  "visitor.pass.create": "/visitors",
};

/** Stable icon keys — the mobile client maps these to Material icons. */
const QUICK_ACTION_ICONS: Record<string, string> = {
  "canteen.order.create": "restaurant",
  "helpdesk.ticket.create": "medical_services",
  "booking.resource.create": "meeting_room",
  "visitor.pass.create": "person_add",
  "attendance.punch.create": "fingerprint",
  "leave.request.create": "event_busy",
  "leave.request.approve": "task_alt",
  "media.asset.capture": "photo_camera",
  "media.asset.upload": "cloud_upload",
  "report.daily.submit": "description",
  "finance.purchase.approve": "shopping_cart",
  "finance.expense.claim": "receipt_long",
};

const QUICK_ACTIONS_MAX_SERVER = 8;

export interface MobileQuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  capability: string;
  tier: number;
  requiresWebHandoff: boolean;
}

export interface MobileTodayHubSection {
  id: "urgent_actions" | "attendance" | "quick_actions" | "timeline" | "circular";
  priority: number;
  enabled: boolean;
  maxItems?: number;
}

export interface MobileTodayHubManifest {
  version: number;
  generatedAt: string;
  quickActions: MobileQuickAction[];
  sections: MobileTodayHubSection[];
}

function roleEligibleForCapability(role: string, capabilityId: string): boolean {
  const cap = getCapability(capabilityId);
  if (!cap) return false;
  if (role === "super_admin") return true;
  return cap.impliedRoles?.some((r) => r === role) ?? false;
}

/**
 * Builds the ordered, role-gated SDUI manifest for the mobile Today hub.
 * - Curated quick actions first, then remaining capability matches (registry order)
 * - Excludes requiresWebHandoff items (Phase 4 territory)
 * - Drops entries whose route is absent from the GoRouter table (MOBILE_ROUTES)
 * - Sections gated server-side; client hides enabled sections that come back empty
 */
export function buildTodayHubManifest(options: {
  role: string;
  requestedVersion?: number;
  now?: Date;
}): MobileTodayHubManifest {
  const { role, now = new Date() } = options;
  const requested = options.requestedVersion ?? TODAY_HUB_VERSION;
  const version = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.trunc(requested), TODAY_HUB_VERSION))
    : TODAY_HUB_VERSION;

  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const id of [
    ...CURATED_QUICK_ACTION_ORDER,
    ...getQuickActions([role as never]).map((cap) => cap.id),
  ]) {
    if (seen.has(id)) continue;
    seen.add(id);
    orderedIds.push(id);
  }

  const quickActions: MobileQuickAction[] = [];
  for (const id of orderedIds) {
    if (quickActions.length >= QUICK_ACTIONS_MAX_SERVER) break;
    const cap = getCapability(id);
    if (!cap) continue;
    if (!roleEligibleForCapability(role, id)) continue;
    if (requiresWebHandoff(id)) continue;
    const route = CURATED_ROUTES[id] ?? cap.mobileRoute;
    if (!route || !MOBILE_ROUTES.has(route)) continue;
    quickActions.push({
      id,
      label: cap.label,
      icon: QUICK_ACTION_ICONS[id] ?? "apps",
      route,
      capability: id,
      tier: cap.tier,
      requiresWebHandoff: false,
    });
  }

  const sections: MobileTodayHubSection[] = [
    { id: "urgent_actions", priority: 1, enabled: true, maxItems: 5 },
    { id: "attendance", priority: 2, enabled: true },
    { id: "quick_actions", priority: 3, enabled: quickActions.length > 0, maxItems: 4 },
    {
      id: "timeline",
      priority: 4,
      enabled: hasPermission(role, "reports:read"),
      maxItems: 5,
    },
    {
      id: "circular",
      priority: 5,
      enabled: hasPermission(role, "circulars:read"),
      maxItems: 1,
    },
  ];

  return {
    version,
    generatedAt: now.toISOString(),
    quickActions,
    sections,
  };
}
