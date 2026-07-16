"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";
import { ShellNav } from "@/components/layout/shell-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { DiagnosticsButton } from "@/components/diagnostics-button";
import { telemetry } from "@/lib/diagnostics/logger";
import { isPhaseOnePath } from "@/config/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import {
  Clock,
  CheckSquare,
  Calendar,
  Home,
  Construction,
} from "lucide-react";

function WorkInProgress() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <Construction className="h-10 w-10 text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Work in Progress</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This feature is currently scheduled for a future phase. We are
            working hard to bring it to you soon!
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/attendance", label: "Attendance", icon: Clock },
            { href: "/tasks", label: "Tasks", icon: CheckSquare },
            { href: "/leaves", label: "Leaves", icon: Calendar },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    telemetry.patchConsole();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <header className="border-b sticky top-0 z-30 bg-card/95 backdrop-blur-sm">
            <div className="flex h-14 items-center gap-4 px-4">
              <ShellNav onSearchOpen={() => setCmdOpen(true)} />
            </div>
          </header>
          <div className="flex flex-1">
            <SidebarNav onSearchOpen={() => setCmdOpen(true)} />
            <main className="flex-1 pb-20 lg:pb-0">
              {children}
            </main>
          </div>
          <BottomNav />
          <DiagnosticsButton />
          <Toaster position="top-right" richColors />
          <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
