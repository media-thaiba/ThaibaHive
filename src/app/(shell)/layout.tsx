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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="relative min-h-screen bg-background text-foreground transition-colors duration-200" data-hydrated={isHydrated}>

            {/* Desktop floating sidebar */}
            <ErrorBoundary>
              <DesktopSideNav onSearchOpen={() => setCmdOpen(true)} />
            </ErrorBoundary>

            <div className="relative z-10 flex min-h-screen flex-col shell-main-wrapper">
              {/* Top navigation header (Desktop & Mobile) */}
              <header
                role="banner"
                className="glass-header sticky top-0 z-[var(--z-sticky)] w-full"
              >
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
            <div className="lg:hidden">
              <ErrorBoundary>
                <BottomNav />
              </ErrorBoundary>
            </div>
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
