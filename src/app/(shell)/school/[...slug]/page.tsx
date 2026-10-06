import { notFound } from "next/navigation";

/**
 * School safety-net catch-all (Phase 1.5).
 *
 * All real routes live physically under school/. Legacy URLs are handled by
 * next.config.ts redirects (LEGACY_REDIRECTS), which run before routing.
 * Anything else that lands here does not exist.
 */
export default function SchoolCatchAll() {
  notFound();
}
