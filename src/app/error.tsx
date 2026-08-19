"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>

      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while processing this request. Our technical team has logged this issue.
      </p>

      {error.digest && (
        <p className="mb-6 text-xs font-mono text-muted-foreground/70">
          Error Digest: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button
          onClick={() => (window.location.href = "/dashboard")}
          variant="outline"
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
