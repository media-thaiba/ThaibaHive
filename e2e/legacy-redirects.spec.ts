import { test, expect } from "@playwright/test";
import {
  LEGACY_REDIRECTS,
  LEGACY_ALLOWLIST,
} from "../src/lib/navigation/legacy-redirects";

/**
 * Phase 1.5 — inverted bridge contract.
 *
 * Every legacy top-level URL must 308 to its canonical workspace URL BEFORE
 * auth (Next routing order: headers → redirects → proxy), and legacy folders
 * on the allowlist must NOT be redirected. One case is generated per rule in
 * the redirect table so this spec can never drift from the source of truth.
 */

function sampleSource(source: string): string {
  return source.replace(":path*", "sample");
}

function sampleDestination(destination: string): string {
  return destination.replace(":path*", "sample");
}

function pathnameOf(location: string): string {
  return new URL(location, "http://localhost").pathname;
}

test.describe("legacy route 308 redirects", () => {
  for (const rule of LEGACY_REDIRECTS) {
    const from = sampleSource(rule.source);
    const to = sampleDestination(rule.destination);

    test(`${from} → 308 ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(pathnameOf(response.headers()["location"])).toBe(to);
    });
  }

  test("bare legacy paths redirect without a trailing subpath", async ({ request }) => {
    const bareCases: Array<[string, string]> = [
      ["/attendance", "/my-work/attendance"],
      ["/tasks", "/my-work/tasks"],
      ["/staff", "/admin/staff"],
      ["/media", "/operations/media-library"],
      ["/examinations", "/school/examinations"],
      ["/academic", "/school"],
      ["/finance", "/operations/finance"],
      ["/marketplace", "/admin/marketplace"],
    ];
    for (const [from, to] of bareCases) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), `${from} should 308`).toBe(308);
      expect(pathnameOf(response.headers()["location"]), from).toBe(to);
    }
  });
});

test.describe("allowlisted legacy folders are not redirected", () => {
  for (const slug of LEGACY_ALLOWLIST) {
    test(`/${slug} stays put (no workspace 308)`, async ({ request }) => {
      const response = await request.get(`/${slug}`, { maxRedirects: 0 });
      expect(response.status()).not.toBe(308);
    });
  }
});
