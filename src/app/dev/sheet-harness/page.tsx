/**
 * Place at: src/app/dev/sheet-harness/page.tsx
 *
 * Dev/E2E-only page. Returns 404 in production unless NEXT_PUBLIC_E2E=1.
 */
"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function SheetHarness() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_E2E !== "1"
  ) {
    notFound();
  }

  const [open, setOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);

  return (
    <main className="p-6">
      <button data-testid="open-sheet" onClick={() => setOpen(true)}>
        Open sheet
      </button>

      {/* Number of times onOpenChange(false) fired. Used to catch double-close bugs. */}
      <output data-testid="close-count">{closeCount}</output>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setCloseCount((c) => c + 1);
          setOpen(next);
        }}
      >
        <SheetContent>
          <SheetHeader data-testid="sheet-header">
            <SheetTitle>Harness sheet</SheetTitle>
            <SheetDescription>Gesture test fixture</SheetDescription>
          </SheetHeader>

          <div
            data-sheet-scroll="true"
            data-testid="sheet-scroll"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          >
            {Array.from({ length: 40 }, (_, i) => (
              <p key={i} className="py-3">
                Row {i + 1}
              </p>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
