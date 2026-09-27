"use client";

import { useQuery } from "@tanstack/react-query";
import { useRoleCheck } from "./use-role-check";
import { api } from "@/lib/api/client";

export type PermissionResponse = {
  role: string;
  permissions: string[];
};

export function useUnifiedPermissions() {
  const { data: serverPermissions, isLoading: loadingServer } = useQuery<PermissionResponse>({
    queryKey: ["auth", "permissions"],
    queryFn: async () => {
      const { data, ok } = await api.get<PermissionResponse>("/api/auth/permissions", { toast: false });
      if (!ok) return { role: "", permissions: [] };
      return data;
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const role = serverPermissions?.role ?? "";
  const clientRoleCheck = useRoleCheck(role || null);

  const permissions = serverPermissions?.permissions ?? [];
  const can = (permission: string): boolean => {
    if (clientRoleCheck.isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const canAny = (...perms: string[]): boolean => perms.some(can);
  const canAll = (...perms: string[]): boolean => perms.every(can);

  return {
    role,
    permissions,
    isLoading: loadingServer,
    isValid: clientRoleCheck.isValid,
    can,
    canAny,
    canAll,
    isSuperAdmin: clientRoleCheck.isSuperAdmin,
    isAdmin: clientRoleCheck.isAdmin,
    isPrincipal: clientRoleCheck.isPrincipal,
    isHod: clientRoleCheck.isHod,
    isStaff: clientRoleCheck.isStaff,
    isOneOf: clientRoleCheck.isOneOf,
  };
}

export type UnifiedPermissions = ReturnType<typeof useUnifiedPermissions>;