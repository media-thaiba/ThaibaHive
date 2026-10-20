import { NextResponse } from "next/server";
import { db, isPostgres } from "@/db";
import { offlineSyncOutbox } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { hasPermission } from "@thaiba/auth";
import type { StaffRole } from "@thaiba/auth";
import { and, eq, gt, inArray, sql, type SQL } from "drizzle-orm";

/**
 * GET /api/mobile/v1/sync/conflicts?since=&userId=
 * - Own tenant + user CONFLICT/NEEDS_REVIEW rows by default.
 * - `userId` for another user requires `sync:manage` (admin listing of
 *   others' NEEDS_REVIEW items).
 */
export const GET = requireAuth(async (request: Request, session) => {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const requestedUserId = url.searchParams.get("userId");
    const scope = await resolveScopedInstitutionId(session.institutionId);
    const scoped = scope && scope !== "global";

    let userId = session.staffId;
    if (requestedUserId && requestedUserId !== session.staffId) {
      if (!hasPermission(session.role as StaffRole, "sync:manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = requestedUserId;
    }

    const conditions: SQL[] = [
      eq(offlineSyncOutbox.userId, userId),
      inArray(offlineSyncOutbox.syncStatus, ["CONFLICT", "NEEDS_REVIEW"]),
    ];
    if (scoped) {
      conditions.push(eq(offlineSyncOutbox.tenantId, scope));
      // Tenant-scanner Rule C: literal institutionId reference — conflicts are
      // also envelope-filtered because the column store has no native tenant key.
      conditions.push(
        isPostgres ? sql`(${offlineSyncOutbox.conflictDetailsJson}::jsonb ->> 'institutionId') = ${scope}` : sql`json_extract(${offlineSyncOutbox.conflictDetailsJson}, '$.institutionId') = ${scope}`
      );
    }
    if (since) {
      conditions.push(gt(offlineSyncOutbox.createdAt, since));
    }

    const rows = await db
      .select()
      .from(offlineSyncOutbox)
      .where(and(...conditions))
      .all();

    const conflicts = rows.map((row) => {
      let details: Record<string, unknown> = {};
      try {
        details = row.conflictDetailsJson ? JSON.parse(row.conflictDetailsJson) : {};
      } catch {
        details = {};
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(row.payloadJson);
      } catch {
        payload = {};
      }
      return {
        id: row.id,
        clientEventId: details.clientEventId ?? null,
        entityType: row.entityType,
        mutationType: row.mutationType,
        status: row.syncStatus,
        fields: Array.isArray(details.fields) ? details.fields : [],
        payload,
        clientTimestamp: row.clientTimestamp,
        createdAt: row.createdAt,
        userId: row.userId,
      };
    });

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error("Sync conflicts list error:", error);
    return NextResponse.json({ error: "Failed to list sync conflicts" }, { status: 500 });
  }
}, "mobile:sync");
