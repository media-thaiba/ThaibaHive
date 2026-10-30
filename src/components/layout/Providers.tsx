"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MotionConfig } from "framer-motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
