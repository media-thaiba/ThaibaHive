import { hasPermission, isValidRole, type StaffRole } from "../../../packages/auth/roles";

export function useRoleCheck(currentRole?: string | null) {
  const role = currentRole ?? null;
  const isValid = role ? isValidRole(role) : false;

  const can = (permission: string): boolean => {
    if (!role || !isValid) return false;
    return hasPermission(role, permission);
  };

  const isOneOf = (...allowedRoles: StaffRole[]): boolean => {
    if (!role || !isValid) return false;
    return allowedRoles.includes(role as StaffRole);
  };

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "super_admin" || role === "admin";
  const isPrincipal = role === "principal";
  const isHod = role === "hod";
  const isStaff = role === "staff";

  return {
    role: isValid ? (role as StaffRole) : null,
    isValid,
    can,
    isOneOf,
    isSuperAdmin,
    isAdmin,
    isPrincipal,
    isHod,
    isStaff,
  };
}
