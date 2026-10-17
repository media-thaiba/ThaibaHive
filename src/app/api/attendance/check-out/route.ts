import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveShift } from "@/lib/attendance/shifts";
import { eq, and } from "drizzle-orm";
import { checkoutPresenceSchema } from "@/lib/validation/schemas";
import { isPresenceTrackingEnabled } from "@/lib/features";
import { enforcePresence } from "@/lib/attendance/presence-enforcement-engine";
import { localDateISO } from "@/lib/attendance/local-date";

export const POST = requireAuth(async (request, session) => {
  try {
    // Optional presence payload — validated, then recomputed server-side.
    let presencePayload: ReturnType<typeof checkoutPresenceSchema.parse> | null =
      null;
    try {
      const raw = await request.text();
      if (raw && raw.trim().length > 0) {
        const parsed = checkoutPresenceSchema.safeParse(JSON.parse(raw));
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
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const today = localDateISO();
    const now = new Date();

    const log = await db
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
    const workedMinutes = Math.round((now.getTime() - checkIn.getTime()) / 60000);

    // ─── Resolve Shift & Calculate Early Exit minutes ───
    const shift = await resolveShift(session.staffId, today);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const shiftEnd = new Date(now);
    shiftEnd.setHours(endH, endM, 0, 0);

    let earlyExitMinutes = 0;
    if (now.getTime() < shiftEnd.getTime()) {
      earlyExitMinutes = Math.floor((shiftEnd.getTime() - now.getTime()) / 60000);
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
      .where(eq(attendanceLogs.id, log.id))
      .returning()
      .get();

    return NextResponse.json({ log: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "attendance:read");
