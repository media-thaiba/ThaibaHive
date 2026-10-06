/**
 * Phase 1.5 guard rails — legacy → workspace route migration.
 *
 * Enforces the post-migration invariants:
 *  1. Every navigation href (and workspace root) resolves to a PHYSICAL
 *     page.tsx — no nav target may depend on a redirect or catch-all.
 *  2. No LEGACY_REDIRECTS source still has a route on disk — redirects run
 *     BEFORE the filesystem, so a leftover legacy page would be silently
 *     shadowed.
 *  3. Every redirect destination resolves physically.
 *  4. No redirect loops (source ≠ destination, destinations never collide
 *     with other sources).
 *  5. Every top-level (shell) folder is either a workspace or allowlisted.
 */
import fs from "fs";
import path from "path";
import { LEGACY_REDIRECTS, LEGACY_ALLOWLIST } from "@/lib/navigation/legacy-redirects";
import { allNavItems, workspaces } from "@/config/navigation";

const shellDir = path.join(__dirname, "..", "..", "..", "app", "(shell)");

const stripPattern = (p: string): string =>
  p.replace(/\/:path\*$/, "").replace(/\/$/, "") || "/";

const segments = (route: string): string[] =>
  route.split("/").filter(Boolean);

const pageExists = (route: string): boolean =>
  fs.existsSync(path.join(shellDir, ...segments(route), "page.tsx"));

const dirExists = (route: string): boolean =>
  fs.existsSync(path.join(shellDir, ...segments(route)));

const WORKSPACE_IDS = new Set(workspaces.map((w) => `/${w.id}`));

describe("navigation targets are physical routes (no redirect-dependent nav)", () => {
  const targets = [...allNavItems.map((i) => i.href), ...WORKSPACE_IDS];

  it("collects a meaningful number of nav targets", () => {
    expect(targets.length).toBeGreaterThan(30);
  });

  for (const target of targets) {
    it(`${target} has a physical page.tsx`, () => {
      expect(pageExists(stripPattern(target))).toBe(true);
    });
  }
});

describe("legacy sources are fully vacated (no shadowed pages)", () => {
  it("has a complete redirect table", () => {
    expect(LEGACY_REDIRECTS.length).toBeGreaterThanOrEqual(30);
  });

  for (const { source } of LEGACY_REDIRECTS) {
    const base = stripPattern(source);
    it(`legacy ${base} no longer exists on disk`, () => {
      expect(dirExists(base)).toBe(false);
    });
  }
});

describe("redirect destinations are physical routes", () => {
  for (const { source, destination } of LEGACY_REDIRECTS) {
    const from = stripPattern(source);
    const to = stripPattern(destination);

    it(`${from} → ${to} targets an existing page`, () => {
      expect(pageExists(to)).toBe(true);
    });

    it(`${from} → ${to} is not a self-redirect`, () => {
      expect(from).not.toBe(to);
    });
  }

  it("has no destination colliding with another source (no redirect chains)", () => {
    const sources = new Set(LEGACY_REDIRECTS.map((r) => stripPattern(r.source)));
    for (const { destination } of LEGACY_REDIRECTS) {
      expect(sources.has(stripPattern(destination))).toBe(false);
    }
  });
});

describe("redirect rule ordering", () => {
  it("places /examinations/report-cards before the /examinations wildcard", () => {
    const reportCards = LEGACY_REDIRECTS.findIndex((r) =>
      r.source.startsWith("/examinations/report-cards")
    );
    const examinations = LEGACY_REDIRECTS.findIndex(
      (r) => r.source === "/examinations/:path*"
    );
    expect(reportCards).toBeGreaterThanOrEqual(0);
    expect(examinations).toBeGreaterThan(reportCards);
  });

  it("keeps /media before-or-after /media-library without cross-matching", () => {
    // Segment-anchored matching means order is irrelevant, but both rules
    // must converge on the same canonical target.
    const media = LEGACY_REDIRECTS.find((r) => r.source === "/media/:path*");
    const mediaLibrary = LEGACY_REDIRECTS.find(
      (r) => r.source === "/media-library/:path*"
    );
    expect(media?.destination).toBe(mediaLibrary?.destination);
  });
});

describe("top-level route folders are workspaces or explicitly allowlisted", () => {
  const topLevel = fs
    .readdirSync(shellDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it("has only workspaces and allowlisted legacy folders at the top level", () => {
    const workspaceNames = new Set<string>(workspaces.map((w) => w.id));
    const allow = new Set<string>(LEGACY_ALLOWLIST);
    const unexpected = topLevel.filter(
      (name) => !workspaceNames.has(name) && !allow.has(name)
    );
    expect(unexpected).toEqual([]);
  });

  it("collision folders keep their legacy pages (pending IA merge)", () => {
    // portal/parent/research/workspace are allowlisted but have no root page.
    for (const name of ["checklists", "reviews"]) {
      expect(pageExists(`/${name}`)).toBe(true);
    }
  });
});
