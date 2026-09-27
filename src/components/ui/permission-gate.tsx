"use client";

import { ReactNode } from "react";
import { useUnifiedPermissions } from "@/lib/hooks/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";

type PermissionGateProps = {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  role?: "super_admin" | "admin" | "principal" | "hod" | "staff" | "accounts" | "purchase" | "regional_admin" | "regional_auditor";
  anyRole?: ("super_admin" | "admin" | "principal" | "hod" | "staff" | "accounts" | "purchase" | "regional_admin" | "regional_auditor")[];
  fallback?: ReactNode;
  children: ReactNode;
  loadingFallback?: ReactNode;
};

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  role,
  anyRole,
  fallback = null,
  children,
  loadingFallback = <Skeleton className="h-10 w-48" />,
}: PermissionGateProps) {
  const { can, canAny, canAll, isLoading, role: userRole, isOneOf } = useUnifiedPermissions();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = hasAccess && can(permission);
  }

  if (anyOf && anyOf.length > 0) {
    hasAccess = hasAccess && canAny(...anyOf);
  }

  if (allOf && allOf.length > 0) {
    hasAccess = hasAccess && canAll(...allOf);
  }

  if (role) {
    hasAccess = hasAccess && userRole === role;
  }

  if (anyRole && anyRole.length > 0) {
    hasAccess = hasAccess && isOneOf(...anyRole);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function PrincipalOrAbove({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function HodOrAbove({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal", "hod"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function FinanceOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal", "hod", "accounts"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function PurchaseOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal", "hod", "purchase"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function StaffOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}