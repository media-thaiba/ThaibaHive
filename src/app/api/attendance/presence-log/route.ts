import { NextResponse } from "next/server";
import { db } from "@/db";
import { presenceLogs, attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, and, desc, inArray } from "drizzle-orm";
import { presenceLogEntrySchema, type PresenceLogEntryInput } from "@/lib/validation/schemas";
import { isPresenceTrackingEnabled } from "@/lib/features";
import {
  enforcePresence,
  resolvePresenceSettings,
  loadGeofenceLocations,
  type ResolvedPresenceSettings,
  type GeofenceLocationInput,
} from "@/lib/attendance/presence-enforcement-engine";

function scopeInstitution(
  sessionInstitutionId: string | null | undefined,
  attendanceInstitutionId: string | null | undefined
): string | null {
  // Attendance row's institution (backfilled/tenant-owned) wins; else session scope.
  if (attendanceInstitutionId) return attendanceInstitutionId;
  if (sessionInstitutionId && sessionInstitutionId !== "global") {
    return sessionInstitutionId;
  }
  return null;
}

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Support single log or bulk upload
    const isBulk = Array.isArray(body.logs);
    const rawLogs = isBulk ? body.logs : [body];

    if (rawLogs.length === 0) {
      return NextResponse.json({ error: "No logs provided" }, { status: 400 });
    }

    if (rawLogs.length > 200) {
      return NextResponse.json(
        { error: "Batch size exceeds maximum of 200 logs" },
        { status: 400 }
      );
    }

    // ── Validate entries (Zod) — single malformed payload returns 400; bulk skips malformed items unless all fail. ──
    const entries: PresenceLogEntryInput[] = [];
    let skipped = 0;
    let firstErrorMsg = "Invalid presence log payload";

    for (const raw of rawLogs) {
      const parsed = presenceLogEntrySchema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        firstErrorMsg = `Invalid presence log entry: ${issue.path.join(".") || "payload"} — ${issue.message}`;
        if (!isBulk) {
          return NextResponse.json({ error: firstErrorMsg }, { status: 400 });
        }
        skipped++;
        continue;
      }
      entries.push(parsed.data);
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: firstErrorMsg }, { status: 400 });
    }

    // ── Resolve attendance rows; entries referencing missing/foreign rows are skipped. ──
    const attendanceIds = [...new Set(entries.map((e) => e.attendanceId))];
    const attendanceRows = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          inArray(attendanceLogs.id, attendanceIds),
          eq(attendanceLogs.staffId, session.staffId)
        )
      )
      .all();
    const attendanceById = new Map(attendanceRows.map((row) => [row.id, row]));

    // ── Feature flag + enforcement context, loaded once per institution. ──
    const contextCache = new Map<
      string,
      {
        featureEnabled: boolean;
        settings: ResolvedPresenceSettings | null;
        locations: GeofenceLocationInput[] | null;
      }
    >();

    async function getContext(institutionId: string | null) {
      const key = institutionId ?? "__global__";
      let entry = contextCache.get(key);
      if (!entry) {
        const featureEnabled = isPresenceTrackingEnabled(
          institutionId ?? undefined
        );
        entry = {
          featureEnabled,
          settings: null,
          locations: null,
        };
        if (featureEnabled) {
          const [settings, locations] = await Promise.all([
            resolvePresenceSettings(institutionId),
            loadGeofenceLocations(institutionId),
          ]);
          entry.settings = settings;
          entry.locations = locations;
        }
        contextCache.set(key, entry);
      }
      return entry;
    }

    const insertedLogs: unknown[] = [];

    // One transaction for the whole batch — presence flushes are frequent and
    // small; a single commit keeps write amplification down.
    await db.transaction(async (tx) => {
      for (const entry of entries) {
        const attendanceLog = attendanceById.get(entry.attendanceId);
        if (!attendanceLog) {
          continue; // Skip invalid logs (missing or not owned by this staff)
        }

        const institutionId = scopeInstitution(
          session.institutionId,
          attendanceLog.institutionId
        );
        const ctx = await getContext(institutionId);

        let storedWithin: boolean;
        let storedMock: boolean;
        let storedDistance: number | null;
        let presenceStatus: "verified" | "unverified" | "field_work";
        let addViolation: boolean;

        if (ctx.featureEnabled && ctx.settings && ctx.locations) {
          // Server-side enforcement — client claims are recomputed, not trusted.
          const outcome = await enforcePresence({
            claims: entry,
            institutionId,
            featureEnabled: true,
            context: { settings: ctx.settings, locations: ctx.locations },
          });
          // within=null only when no geofence is configured — vacuous pass.
          storedWithin = outcome.evaluation.withinGeofence !== false;
          storedMock = outcome.evaluation.mockSuspected;
          storedDistance = outcome.evaluation.distanceMeters;
          presenceStatus = outcome.presenceStatus;
          addViolation = outcome.violationsIncrement;
        } else {
          // Flag off: record telemetry without incrementing enforcement violation counters from unverified client claims.
          storedWithin = entry.isWithinGeofence ?? true;
          storedMock = entry.isMockLocation ?? false;
          storedDistance = entry.distanceFromOffice ?? null;
          presenceStatus = storedMock
            ? "unverified"
            : !storedWithin
              ? "field_work"
              : "verified";
          addViolation = false;
        }

        const logId = crypto.randomUUID();
        const newLog = await tx
          .insert(presenceLogs)
          .values({
            id: logId,
            attendanceId: entry.attendanceId,
            staffId: session.staffId,
            institutionId,
            latitude: entry.latitude,
            longitude: entry.longitude,
            accuracy: entry.accuracy ?? null,
            isWithinGeofence: storedWithin,
            isMockLocation: storedMock,
            wifiSsid: entry.wifiSsid ?? null,
            verificationMethod: entry.verificationMethod ?? "gps",
            distanceFromOffice: storedDistance,
            networkState: entry.networkState ?? "online",
            batteryLevel: entry.batteryLevel ?? null,
          })
          .returning()
          .get();

        insertedLogs.push(newLog);

        const currentViolations = attendanceLog.geofenceViolations ?? 0;
        const nextViolations = addViolation
          ? currentViolations + 1
          : currentViolations;
        attendanceLog.geofenceViolations = nextViolations;
        attendanceLog.presenceStatus = presenceStatus;

        await tx
          .update(attendanceLogs)
          .set({
            presenceStatus,
            lastVerifiedAt: new Date().toISOString(),
            geofenceViolations: nextViolations,
          })
          .where(eq(attendanceLogs.id, entry.attendanceId))
          .run();
      }
    });

    return NextResponse.json(
      isBulk && skipped > 0 ? { logs: insertedLogs, skipped } : { logs: insertedLogs },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "attendance:read");

export const GET = requireAuth(async (request, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get("attendanceId");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = db
      .select()
      .from(presenceLogs)
      .where(eq(presenceLogs.staffId, session.staffId))
      .orderBy(desc(presenceLogs.createdAt))
      .limit(limit);

    if (attendanceId) {
      query = db
        .select()
        .from(presenceLogs)
        .where(
          and(
            eq(presenceLogs.staffId, session.staffId),
            eq(presenceLogs.attendanceId, attendanceId)
          )
        )
        .orderBy(desc(presenceLogs.createdAt))
        .limit(limit);
    }

    const logs = await query.all();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "attendance:read");
