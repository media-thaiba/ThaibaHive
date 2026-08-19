"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>{children}</ThemeProvider>
    </ErrorBoundary>
  );
}
