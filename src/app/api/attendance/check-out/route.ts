import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveShift } from "@/lib/attendance/shifts";
import { eq, and, isNull } from "drizzle-orm";
import { checkoutPresenceSchema } from "@/lib/validation/schemas";
import { isPresenceTrackingEnabled } from "@/lib/features";
import { enforcePresence } from "@/lib/attendance/presence-enforcement-engine";
import { localDateISO } from "@/lib/attendance/local-date";

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localMidnight(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    // Optional presence payload — validated, then recomputed server-side.
    let presencePayload: ReturnType<typeof checkoutPresenceSchema.parse> | null =
      null;
    try {
      const raw = await request.text();
      if (raw && raw.trim().length > 0) {
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          return NextResponse.json(
            { error: "Invalid JSON payload" },
            { status: 400 }
          );
        }
        const parsed = checkoutPresenceSchema.safeParse(parsedJson);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          return NextResponse.json(
            {
              error: `Invalid presence payload: ${issue.path.join(".") || "payload"} — ${issue.message}`,
            },
            { status: 400 }
          );
        }
        presencePayload = parsed.data;
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const today = localDateISO();
    const now = new Date();

    let log = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.staffId, session.staffId),
          eq(attendanceLogs.date, today)
        )
      )
      .get();

    if (!log) {
      // Overnight cross-day shifts: a shift that started yesterday (endTime <
      // startTime) must be closable today. Only yesterday's UNCLOSED log whose
      // resolved shift is overnight qualifies; forgotten normal-shift
      // check-outs remain an administrative correction, not a self-checkout.
      const [ty, tm, td] = today.split("-").map(Number);
      const yesterday = localDateISO(new Date(ty, tm - 1, td - 1));
      const candidate = await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.staffId, session.staffId),
            eq(attendanceLogs.date, yesterday),
            isNull(attendanceLogs.checkOut)
          )
        )
        .get();

      if (candidate) {
        const candidateShift = await resolveShift(
          session.staffId,
          candidate.date
        );
        if (
          minutesOfDay(candidateShift.endTime) <
          minutesOfDay(candidateShift.startTime)
        ) {
          log = candidate;
        }
      }
    }

    if (!log) {
      return NextResponse.json(
        { error: "No check-in found for today." },
        { status: 400 }
      );
    }

    if (log.checkOut) {
      return NextResponse.json(
        { error: "Already checked out today." },
        { status: 409 }
      );
    }

    // ─── Server-side presence enforcement (flag-gated) ───
    const presenceUpdate: Record<string, unknown> = {};
    if (presencePayload) {
      const institutionId =
        log.institutionId ??
        (session.institutionId && session.institutionId !== "global"
          ? session.institutionId
          : null);

      if (isPresenceTrackingEnabled(institutionId ?? undefined)) {
        const outcome = await enforcePresence({
          claims: presencePayload,
          institutionId,
          featureEnabled: true,
        });

        // Hard rejection only for deterministic mock detection when the
        // feature is live (flag on, enabled, shadow mode off).
        if (outcome.evaluation.mockSuspected && outcome.enforceable) {
          return NextResponse.json(
            { error: "Presence verification failed: mock location detected." },
            { status: 403 }
          );
        }

        presenceUpdate.presenceStatus = outcome.presenceStatus;
        presenceUpdate.lastVerifiedAt = now.toISOString();
        if (outcome.violationsIncrement) {
          presenceUpdate.geofenceViolations =
            (log.geofenceViolations ?? 0) + 1;
        }
      }
      // Flag off: payload is validated but not enforced (rollout safety).
    }

    const checkIn = new Date(log.checkIn!);
    const workedMinutes = Math.max(
      0,
      Math.round((now.getTime() - checkIn.getTime()) / 60000)
    );

    // ─── Resolve Shift (anchored to the log's own date) & early exit ───
    const shift = await resolveShift(session.staffId, log.date);
    const isOvernight =
      minutesOfDay(shift.endTime) < minutesOfDay(shift.startTime);

    const [endH, endM] = shift.endTime.split(":").map(Number);
    const shiftEnd = localMidnight(log.date);
    shiftEnd.setHours(endH, endM, 0, 0);
    if (isOvernight) {
      // Overnight shift: end lands the NEXT calendar day after the check-in.
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    let earlyExitMinutes = 0;
    if (now.getTime() < shiftEnd.getTime()) {
      earlyExitMinutes = Math.max(
        0,
        Math.floor((shiftEnd.getTime() - now.getTime()) / 60000)
      );
    }

    const updated = await db
      .update(attendanceLogs)
      .set({
        checkOut: now.toISOString(),
        workedMinutes,
        earlyExitMinutes,
        source: "self",
        ...presenceUpdate,
      })
      .where(
        and(
          eq(attendanceLogs.id, log.id),
          isNull(attendanceLogs.checkOut)
        )
      )
      .returning()
      .get();

    if (!updated) {
      // A concurrent request closed this log first — atomic guard lost the race.
      return NextResponse.json(
        { error: "Already checked out today." },
        { status: 409 }
      );
    }

    return NextResponse.json({ log: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "attendance:read");
