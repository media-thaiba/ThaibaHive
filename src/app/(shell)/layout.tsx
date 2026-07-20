"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";
import { ShellNav } from "@/components/layout/shell-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DiagnosticsButton } from "@/components/diagnostics-button";
import { Toaster } from "sonner";
import { useState, lazy, Suspense } from "react";

const CommandPalette = lazy(() =>
  import("@/components/layout/command-palette").then((m) => ({ default: m.CommandPalette }))
);

function CommandPaletteFallback() {
  return null;
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <QueryProvider>
      <AuthProvider>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-[var(--z-sticky)] border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
              <ShellNav onSearchOpen={() => setCmdOpen(true)} />
            </div>
          </header>
          <div className="flex flex-1">
            <SidebarNav onSearchOpen={() => setCmdOpen(true)} />
            <main id="main-content" className="flex-1 pb-20 lg:pb-0">
              {children}
            </main>
          </div>
          <BottomNav />
          <DiagnosticsButton />
          <Toaster position="top-right" richColors />
          <Suspense fallback={<CommandPaletteFallback />}>
            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          </Suspense>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
