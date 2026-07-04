"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function ShellHome() {
  const { staff, logout } = useAuth();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">
        Welcome, {staff?.firstName} {staff?.lastName}
      </h2>
      <p className="text-muted-foreground">
        {staff?.designation || staff?.role} &middot; {staff?.employeeId}
      </p>
      <button
        onClick={logout}
        className="mt-4 text-sm text-destructive hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
