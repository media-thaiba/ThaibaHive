"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ShellNav } from "@/components/layout/shell-nav";
import { DesktopSideNav } from "@/components/layout/desktop-side-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DiagnosticsButton } from "@/components/diagnostics-button";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useState, useEffect, lazy, Suspense } from "react";

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
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="relative min-h-screen bg-background text-foreground transition-colors duration-200" data-hydrated={isHydrated}>
            {/* Ambient glow layer — soft atmospheric depth (MediaHive parity, emerald-tinted) */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
              <div
                className="absolute inset-x-0 -top-[200px] h-[600px] opacity-50"
                style={{
                  background:
                    "radial-gradient(1200px 600px at 50% 0%, rgba(16, 185, 129, 0.15), transparent 60%)",
                }}
              />
              <div className="absolute -top-40 left-1/3 h-[700px] w-[700px] animate-drift rounded-full bg-emerald-600/10 blur-[140px]" />
              <div
                className="absolute top-1/2 -right-[200px] h-[600px] w-[600px] animate-drift rounded-full bg-teal-500/10 blur-[140px]"
                style={{ animationDelay: "-15s" }}
              />
            </div>

            {/* Desktop floating sidebar */}
            <ErrorBoundary>
              <DesktopSideNav onSearchOpen={() => setCmdOpen(true)} />
            </ErrorBoundary>

            <div className="relative z-10 flex min-h-screen flex-col transition-[padding-left] duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:pl-[calc(var(--current-sidebar-width)+3rem)]">
              {/* Mobile top bar — desktop navigation lives in the floating sidebar */}
              <header
                role="banner"
                className="glass-header sticky top-0 z-[var(--z-sticky)] lg:hidden"
              >
                <div className="flex h-14 items-center gap-4 px-4">
                  <ErrorBoundary>
                    <ShellNav onSearchOpen={() => setCmdOpen(true)} />
                  </ErrorBoundary>
                </div>
              </header>
              <main
                id="main-content"
                role="main"
                className="mx-auto w-full min-h-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10"
                tabIndex={-1}
              >
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
            <nav role="navigation" aria-label="Mobile navigation" className="lg:hidden">
              <ErrorBoundary>
                <BottomNav />
              </ErrorBoundary>
            </nav>
            <DiagnosticsButton />
            <Toaster position="top-right" richColors />
            <Suspense fallback={<CommandPaletteFallback />}>
              <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
            </Suspense>
          </div>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
