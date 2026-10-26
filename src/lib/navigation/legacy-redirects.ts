/**
 * Phase 1.5 — legacy → workspace route redirects (inverted bridge).
 *
 * All legacy top-level pages now live under their owning workspace folder.
 * These rules 308-redirect every old URL (and its dynamic subpaths) to the
 * canonical workspace URL. They run BEFORE the filesystem and the auth proxy
 * (Next routing order: headers → redirects → proxy), so a legacy URL always
 * bounces first, even when unauthenticated.
 *
 * Consumed by:
 *  - next.config.ts (async redirects())
 *  - src/lib/navigation/__tests__/legacy-redirects.test.ts (guard rails)
 *
 * ORDER MATTERS — first match wins. Specific rules must precede the
 * folder-wildcard rules they would otherwise be captured by
 * (e.g. /examinations/report-cards/:path* before /examinations/:path*).
 * Segment matching is exact per segment: /finance/:path* never matches
 * /finance-audit, and /media/:path* never matches /media-library.
 */
export type LegacyRedirect = {
  /** Legacy path pattern (supports :path* for dynamic subpaths). */
  source: string;
  /** Canonical workspace path. */
  destination: string;
};

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  // --- School specials (specific first) ---
  { source: "/examinations/report-cards/:path*", destination: "/school/grades/:path*" },
  { source: "/examinations/:path*", destination: "/school/examinations/:path*" },
  { source: "/academic/:path*", destination: "/school/:path*" },
  { source: "/school/circulars/:path*", destination: "/my-work/circulars/:path*" },
  { source: "/school/events/:path*", destination: "/my-work/events/:path*" },
  { source: "/school/polls/:path*", destination: "/my-work/polls/:path*" },
  { source: "/school/announcements/:path*", destination: "/my-work/announcements/:path*" },

  // --- Admin renames (specific first) ---
  { source: "/admin/security/identity/:path*", destination: "/admin/keys/:path*" },
  { source: "/admin/security/zero-trust", destination: "/admin/security" },
  { source: "/admin/nfc/:path*", destination: "/admin/hardware/:path*" },
  { source: "/admin/audit-logs/:path*", destination: "/admin/audit/:path*" },

  // --- My Work (17) ---
  { source: "/attendance/:path*", destination: "/my-work/attendance/:path*" },
  { source: "/tasks/:path*", destination: "/my-work/tasks/:path*" },
  { source: "/leaves/:path*", destination: "/my-work/leaves/:path*" },
  { source: "/reports/:path*", destination: "/my-work/reports/:path*" },
  { source: "/approvals/:path*", destination: "/my-work/approvals/:path*" },
  { source: "/timeline/:path*", destination: "/my-work/timeline/:path*" },
  { source: "/canteen/:path*", destination: "/my-work/canteen/:path*" },
  { source: "/expenses/:path*", destination: "/my-work/expenses/:path*" },
  { source: "/availability/:path*", destination: "/my-work/availability/:path*" },
  { source: "/recognition/:path*", destination: "/my-work/recognition/:path*" },
  { source: "/grievances/:path*", destination: "/my-work/complaints/:path*" },
  { source: "/announcements/:path*", destination: "/my-work/announcements/:path*" },
  { source: "/events/:path*", destination: "/my-work/events/:path*" },
  { source: "/circulars/:path*", destination: "/my-work/circulars/:path*" },
  { source: "/polls/:path*", destination: "/my-work/polls/:path*" },
  { source: "/chat/:path*", destination: "/my-work/chat/:path*" },
  { source: "/settings/:path*", destination: "/my-work/settings/:path*" },

  // --- Operations (12 sources; /media is a deleted wrapper → canonical media-library) ---
  { source: "/finance/:path*", destination: "/operations/finance/:path*" },
  { source: "/finance-audit/:path*", destination: "/operations/finance-audit/:path*" },
  { source: "/finance-requests/:path*", destination: "/operations/finance-requests/:path*" },
  { source: "/accounts/:path*", destination: "/operations/accounts/:path*" },
  { source: "/purchases/:path*", destination: "/operations/procurement/:path*" },
  { source: "/assets/:path*", destination: "/operations/assets/:path*" },
  { source: "/vehicles/:path*", destination: "/operations/fleet/:path*" },
  { source: "/help-desk/:path*", destination: "/operations/facilities/:path*" },
  { source: "/bookings/:path*", destination: "/operations/bookings/:path*" },
  { source: "/visitors/:path*", destination: "/operations/visitors/:path*" },
  { source: "/media-library/:path*", destination: "/operations/media-library/:path*" },
  { source: "/media/:path*", destination: "/operations/media-library/:path*" },

  // --- Administration (3) ---
  { source: "/staff/:path*", destination: "/admin/staff/:path*" },
  { source: "/marketplace/:path*", destination: "/admin/marketplace/:path*" },
  { source: "/docs/:path*", destination: "/admin/docs/:path*" },
];

/** Legacy top-level folders that intentionally have no redirect (allowlist). */
export const LEGACY_ALLOWLIST = ["checklists", "reviews", "portal", "parent", "research", "workspace"] as const;

/**
 * Resolves a runtime pathname against LEGACY_REDIRECTS.
 * Returns the destination URL string or null if no redirect matches.
 */
export function resolveLegacyRedirect(pathname: string): string | null {
  for (const { source, destination } of LEGACY_REDIRECTS) {
    if (source.endsWith("/:path*")) {
      const sourceBase = source.slice(0, -":path*".length - 1);
      const prefix = source.slice(0, -":path*".length);
      const destBase = destination.replace("/:path*", "");

      if (pathname === sourceBase) {
        return destBase;
      }
      if (pathname.startsWith(prefix)) {
        const subpath = pathname.slice(prefix.length);
        return destination.includes(":path*")
          ? destination.replace(":path*", subpath)
          : `${destBase}/${subpath}`;
      }
    } else if (pathname === source) {
      return destination;
    }
  }
  return null;
}
