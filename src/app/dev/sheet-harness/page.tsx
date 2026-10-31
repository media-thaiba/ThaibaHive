/**
 * Place at: src/app/dev/sheet-harness/page.tsx
 *
 * Dev/E2E-only page. Returns 404 in production unless NEXT_PUBLIC_E2E=1.
 */
import { notFound } from "next/navigation";
import { SheetHarnessClient } from "./sheet-harness-client";

export default function SheetHarness() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_E2E !== "1"
  ) {
    notFound();
  }

  return <SheetHarnessClient />;
}
