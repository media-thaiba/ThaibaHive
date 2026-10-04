"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MediaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Media gallery error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex-1 min-h-[400px] flex items-center justify-center p-6" role="alert" aria-live="assertive">
      <div className="text-center space-y-4 max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Unable to load media assets
        </h2>
        <p className="text-sm text-muted-foreground">
          Digital media library assets or encrypted streams failed to load. Please retry.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground/70 bg-muted px-2 py-1 rounded inline-block">
            Digest: {error.digest}
          </p>
        )}
        <div className="pt-2">
          <Button onClick={() => reset()} variant="default" className="w-full sm:w-auto">
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
