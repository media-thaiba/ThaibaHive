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
