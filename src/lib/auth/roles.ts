import type { StaffRole } from "@/types";

type Permission = string;

const rolePermissions: Record<StaffRole, Permission[]> = {
  super_admin: ["*"],
  admin: [
    "staff:read",
    "staff:create",
    "staff:update",
    "staff:delete",
    "attendance:read",
    "attendance:manage",
    "tasks:read",
    "tasks:create",
    "tasks:assign",
    "leaves:read",
    "leaves:approve",
    "reports:read",
    "reports:review",
    "announcements:create",
    "announcements:manage",
    "events:create",
    "events:manage",
    "polls:create",
    "polls:manage",
    "bookings:manage",
    "helpdesk:manage",
    "org:manage",
  ],
  hod: [
    "staff:read",
    "attendance:read",
    "tasks:read",
    "tasks:create",
    "tasks:assign",
    "leaves:read",
    "leaves:approve",
    "reports:read",
    "reports:review",
    "announcements:create",
    "events:create",
  ],
  staff: [
    "attendance:read",
    "tasks:read",
    "leaves:read",
    "reports:create",
    "reports:read",
  ],
};

export function hasPermission(role: StaffRole, permission: Permission) {
  if (role === "super_admin") return true;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: StaffRole) {
  return rolePermissions[role] ?? [];
}
