"use client";

import { Button } from "@/components/ui/button";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">!</div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}