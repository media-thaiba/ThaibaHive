import { notFound } from "next/navigation";

/**
 * Administration safety-net catch-all (Phase 1.5).
 *
 * All real routes live physically under admin/. Legacy URLs are handled by
 * next.config.ts redirects (LEGACY_REDIRECTS), which run before routing.
 * Anything else that lands here does not exist.
 */
export default function AdminCatchAll() {
  notFound();
}
