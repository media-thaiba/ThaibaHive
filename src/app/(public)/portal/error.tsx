"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PublicPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public portal error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-[500px] max-w-xl mx-auto flex items-center justify-center p-6" role="alert" aria-live="assertive">
      <div className="text-center space-y-4 w-full bg-card border border-border rounded-2xl p-8 shadow-md">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Portal temporarily unavailable
        </h2>
        <p className="text-sm text-muted-foreground">
          Could not load the institutional portal data. Please try again in a few moments.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground/70 bg-muted px-2 py-1 rounded inline-block">
            Digest: {error.digest}
          </p>
        )}
        <div className="pt-2">
          <Button onClick={() => reset()} variant="default">
            Reload Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
