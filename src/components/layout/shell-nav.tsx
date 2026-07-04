"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/tasks", label: "Tasks" },
  { href: "/reports", label: "Reports" },
  { href: "/leaves", label: "Leaves" },
  { href: "/staff", label: "Staff" },
  { href: "/admin/institutions", label: "Admin" },
];

export function ShellNav() {
  const pathname = usePathname();
  const { staff, logout } = useAuth();

  return (
    <nav className="flex flex-1 items-center justify-between">
      <div className="flex items-center gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith(link.href) && link.href !== "/"
                ? "bg-muted font-medium"
                : pathname === link.href
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {staff?.firstName} {staff?.lastName}
        </span>
        <button
          onClick={logout}
          className="text-xs text-destructive hover:underline"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
