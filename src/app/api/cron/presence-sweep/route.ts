import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveShift } from "@/lib/attendance/shifts";
import { eq, and, isNull, or } from "drizzle-orm";
import { isPresenceTrackingEnabled } from "@/lib/features";
import {
  resolvePresenceSettings,
  type ResolvedPresenceSettings,
} from "@/lib/attendance/presence-enforcement-engine";

export const dynamic = "force-dynamic";

/**
 * Presence staleness sweep (v3.42.0).
 *
 * Finds open attendance sessions whose last presence proof is older than
 * checkIntervalMinutes + gracePeriodMinutes and, per tenant settings:
 *   - increments the presence-violation counter (always, when stale)
 *   - checks the session out when autoCheckoutOnViolation is enabled and the
 *     feature is live (flag on, verification enabled, shadow mode off)
 *
 * Checkout timestamp is capped at min(now, shiftEnd, session-date 23:59) and
 * stamped source: "auto". Shadow mode and feature-flag-off are log-only/skip.
 * Supports ?dryRun=1 for inspection without writes.
 */

interface SweepCandidate {
  id: string;
  staffId: string;
  institutionId: string | null;
  date: string;
  checkIn: string;
  lastVerifiedAt: string | null;
  geofenceViolations: number | null;
}

interface ResolvedContext {
  settings: ResolvedPresenceSettings;
  featureEnabled: boolean;
}

function startOfDay(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000`).getTime();
}

function endOfDay(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

export const GET = requireAuth(async (request) => {
  return runSweep(request);
}, "system:cron");

export const POST = requireAuth(async (request) => {
  return runSweep(request);
}, "system:cron");

async function runSweep(request: Request): Promise<Response> {
  try {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

    // Note: no global flag gate here — per-institution flag resolution happens
    // in getContext() so tenant-override rollouts work while env-off (no
    // overrides) still fail-closes by skipping every session.

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 86_400_000)
      .toISOString()
      .split("T")[0];

    // Open sessions from today or yesterday (covers overnight, avoids
    // mass-processing ancient never-closed rows).
    const candidates = await db
      .select({
        id: attendanceLogs.id,
        staffId: attendanceLogs.staffId,
        institutionId: attendanceLogs.institutionId,
        date: attendanceLogs.date,
        checkIn: attendanceLogs.checkIn,
        lastVerifiedAt: attendanceLogs.lastVerifiedAt,
        geofenceViolations: attendanceLogs.geofenceViolations,
      })
      .from(attendanceLogs)
      .where(
        and(
          isNull(attendanceLogs.checkOut),
          or(eq(attendanceLogs.date, today), eq(attendanceLogs.date, yesterday))
        )
      )
      .all() as SweepCandidate[];

    // Resolve settings + flag once per institution.
    const contextCache = new Map<string, ResolvedContext>();
    async function getContext(institutionId: string | null) {
      const key = institutionId ?? "__global__";
      let ctx = contextCache.get(key);
      if (!ctx) {
        const featureEnabled = isPresenceTrackingEnabled(
          institutionId ?? undefined
        );
        const settings = await resolvePresenceSettings(institutionId);
        ctx = { settings, featureEnabled };
        contextCache.set(key, ctx);
      }
      return ctx;
    }

    const staleIds: string[] = [];
    const autoCheckoutIds: string[] = [];
    const shadowOnlyIds: string[] = [];
    const skippedDisabled: string[] = [];
    const checkoutPlan: {
      id: string;
      checkOut: string;
      workedMinutes: number;
      earlyExitMinutes: number;
      violations: number;
    }[] = [];
    const violationPlan: { id: string; violations: number }[] = [];

    for (const candidate of candidates) {
      const ctx = await getContext(candidate.institutionId);
      const { settings, featureEnabled } = ctx;

      if (!featureEnabled || !settings.isEnabled) {
        skippedDisabled.push(candidate.id);
        continue;
      }

      // Staleness baseline: last presence proof, else the check-in itself.
      const baselineMs = candidate.lastVerifiedAt
        ? new Date(candidate.lastVerifiedAt).getTime()
        : new Date(candidate.checkIn).getTime();
      const windowMs =
        (settings.checkIntervalMinutes + settings.gracePeriodMinutes) * 60_000;

      if (now.getTime() <= baselineMs + windowMs) {
        continue; // Fresh
      }

      staleIds.push(candidate.id);
      const violations = (candidate.geofenceViolations ?? 0) + 1;

      const enforceable =
        !settings.shadowMode && settings.autoCheckoutOnViolation;

      if (enforceable) {
        autoCheckoutIds.push(candidate.id);

        // Cap: min(now, shiftEnd, session-date 23:59), never before check-in.
        const shift = await resolveShift(candidate.staffId, candidate.date);
        const [endH, endM] = shift.endTime.split(":").map(Number);
        const shiftEnd = startOfDay(candidate.date) + endH * 3_600_000 + endM * 60_000;
        const capped = Math.min(now.getTime(), shiftEnd, endOfDay(candidate.date));
        const checkInMs = new Date(candidate.checkIn).getTime();
        const checkoutMs = Math.max(capped, checkInMs);

        const workedMinutes = Math.max(
          0,
          Math.round((checkoutMs - checkInMs) / 60_000)
        );
        const earlyExitMinutes =
          shiftEnd > checkoutMs
            ? Math.floor((shiftEnd - checkoutMs) / 60_000)
            : 0;

        checkoutPlan.push({
          id: candidate.id,
          checkOut: new Date(checkoutMs).toISOString(),
          workedMinutes,
          earlyExitMinutes,
          violations,
        });
      } else {
        // Shadow mode / auto-checkout disabled: log the violation only.
        shadowOnlyIds.push(candidate.id);
        violationPlan.push({ id: candidate.id, violations });
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        baseFlag: isPresenceTrackingEnabled(),
        scanned: candidates.length,
        staleSessions: staleIds.length,
        autoCheckouts: autoCheckoutIds.length,
        shadowOnlyViolations: shadowOnlyIds.length,
        skippedDisabledOrFlagOff: skippedDisabled.length,
        ids: { stale: staleIds, autoCheckout: autoCheckoutIds },
      });
    }

    // One transaction for the sweep batch — bounded to today/yesterday rows.
    if (violationPlan.length > 0 || checkoutPlan.length > 0) {
      await db.transaction(async (tx) => {
        for (const row of violationPlan) {
          await tx
            .update(attendanceLogs)
            .set({ geofenceViolations: row.violations })
            .where(eq(attendanceLogs.id, row.id))
            .run();
        }
        for (const row of checkoutPlan) {
          await tx
            .update(attendanceLogs)
            .set({
              checkOut: row.checkOut,
              workedMinutes: row.workedMinutes,
              earlyExitMinutes: row.earlyExitMinutes,
              geofenceViolations: row.violations,
              presenceStatus: "unverified",
              source: "auto",
            })
            .where(eq(attendanceLogs.id, row.id))
            .run();
        }
      });
    }

    return NextResponse.json({
      scanned: candidates.length,
      staleSessions: staleIds.length,
      autoCheckouts: autoCheckoutIds.length,
      shadowOnlyViolations: shadowOnlyIds.length,
      skippedDisabledOrFlagOff: skippedDisabled.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
