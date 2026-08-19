"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion className="h-10 w-10" />
      </div>

      <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        404
      </h1>

      <h2 className="mb-3 text-xl font-semibold text-foreground">
        Page Not Found
      </h2>

      <p className="mb-8 max-w-md text-sm text-muted-foreground leading-relaxed">
        The page you are looking for does not exist, has been moved, or you may not have permission to view it.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="default" className="gap-2">
            <Home className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
