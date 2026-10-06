import { notFound } from "next/navigation";

/**
 * My Work safety-net catch-all (Phase 1.5).
 *
 * All real routes live physically under my-work/. Legacy URLs are handled by
 * next.config.ts redirects (LEGACY_REDIRECTS), which run before routing.
 * Anything else that lands here does not exist.
 */
export default function MyWorkCatchAll() {
  notFound();
}
