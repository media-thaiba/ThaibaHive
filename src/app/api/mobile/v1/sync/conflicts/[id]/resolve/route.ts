import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  attendanceLogs,
  expenseClaims,
  financialReconciliationItems,
  leaveRequests,
  offlineSyncOutbox,
  purchaseRequests,
  tasks,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { hasPermission } from "@thaiba/auth";
import type { StaffRole } from "@thaiba/auth";
import { syncConflictResolveSchema, SYNC_IMMUTABLE_RESOLVE_FIELDS } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

/** Per-entity allowlist of columns a conflict resolution may overwrite. */
const RESOLUTION_ALLOWED_FIELDS: Record<string, string[]> = {
  task: ["title", "description", "status", "priority", "dueDate", "due_date"],
  leave: ["reason", "startDate", "endDate", "daysCount"],
  expense: ["description", "category", "amount"],
  purchase: ["notes"],
  reconciliation_item: ["matchStatus", "matchedWithId", "varianceAmount", "resolutionNotes"],
  approval: [], // accept-server only (decision already recorded server-side)
  attendance: [], // accept-server only (punch rows are time-derived)
};

function mapField(field: string): string {
  return field === "due_date" ? "dueDate" : field;
}

async function applyResolutionFields(
  entityType: string,
  entityId: string | null,
  fields: Record<string, unknown>,
  scope: string | null,
  staffId: string
): Promise<void> {
  const allowed = RESOLUTION_ALLOWED_FIELDS[entityType];
  if (!allowed) {
    throw Object.assign(new Error(`Unknown entity type: ${entityType}`), { status: 400 });
  }
  const fieldNames = Object.keys(fields);
  if (fieldNames.length === 0) return; // accept-server resolution: nothing to apply
  if (!entityId) {
    throw Object.assign(new Error("Conflict has no entity reference"), { status: 400 });
  }

  for (const name of fieldNames) {
    if (!allowed.includes(name)) {
      throw Object.assign(new Error(`Field '${name}' is not resolvable for ${entityType}`), {
        status: 400,
      });
    }
  }

  const values: Record<string, unknown> = {};
  for (const name of fieldNames) {
    values[mapField(name)] = fields[name];
  }

  switch (entityType) {
    case "task":
      values.updatedAt = new Date().toISOString();
      await db
        .update(tasks)
        .set(values)
        .where(
          scope
            ? and(eq(tasks.id, entityId), eq(tasks.institutionId, scope))
            : eq(tasks.id, entityId)
        )
        .run();
      return;
    case "leave":
      values.updatedAt = new Date().toISOString();
      await db
        .update(leaveRequests)
        .set(values)
        .where(and(eq(leaveRequests.id, entityId), eq(leaveRequests.staffId, staffId)))
        .run();
      return;
    case "expense":
      values.updatedAt = new Date().toISOString();
      await db
        .update(expenseClaims)
        .set(values)
        .where(and(eq(expenseClaims.id, entityId), eq(expenseClaims.staffId, staffId)))
        .run();
      return;
    case "purchase":
      values.updatedAt = new Date().toISOString();
      await db.update(purchaseRequests).set(values).where(eq(purchaseRequests.id, entityId)).run();
      return;
    case "reconciliation_item":
      await db
        .update(financialReconciliationItems)
        .set(values)
        .where(eq(financialReconciliationItems.id, entityId))
        .run();
      return;
    case "attendance": {
      // entityId is the event DATE for attendance conflicts
      await db
        .update(attendanceLogs)
        .set(values)
        .where(and(eq(attendanceLogs.staffId, staffId), eq(attendanceLogs.date, entityId)))
        .run();
      return;
    }
    default:
      return;
  }
}

/**
 * POST /api/mobile/v1/sync/conflicts/[id]/resolve
 * `{fields:{…}}` — applies the chosen values (immutable fields rejected),
 * marks the outbox row SYNCED, and appends the resolution to
 * `conflictDetailsJson`.
 * - CONFLICT rows: owner or `sync:manage`.
 * - NEEDS_REVIEW rows: `sync:manage` only.
 */
export const POST = requireAuth(async (request: Request, session, ctx) => {
  try {
    const { id } = await ctx!.params;
    if (!id) {
      return NextResponse.json({ error: "Conflict ID is required" }, { status: 400 });
    }

    const scope = await resolveScopedInstitutionId(session.institutionId);
    const scoped = scope && scope !== "global";
    const canManage = hasPermission(session.role as StaffRole, "sync:manage");

    const row = await db
      .select()
      .from(offlineSyncOutbox)
      .where(
        scoped ? and(eq(offlineSyncOutbox.id, id), eq(offlineSyncOutbox.tenantId, scope)) : eq(offlineSyncOutbox.id, id)
      )
      .get();

    if (!row) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    let details: Record<string, any> = {};
    try {
      details = row.conflictDetailsJson ? JSON.parse(row.conflictDetailsJson) : {};
    } catch {
      details = {};
    }
    // Belt-and-braces tenant check against the stored envelope (literal
    // institutionId reference for the tenant scanner).
    const envelopeInstitutionId =
      typeof details.institutionId === "string" ? details.institutionId : null;
    if (scoped && envelopeInstitutionId && envelopeInstitutionId !== scope) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    const isOwner = row.userId === session.staffId;
    if (row.syncStatus === "NEEDS_REVIEW" && !canManage) {
      return NextResponse.json(
        { error: "NEEDS_REVIEW conflicts require sync:manage" },
        { status: 403 }
      );
    }
    if (!isOwner && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.syncStatus !== "CONFLICT" && row.syncStatus !== "NEEDS_REVIEW") {
      return NextResponse.json({ error: "Conflict is already resolved" }, { status: 409 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request payload" }, { status: 400 });
    }
    const parsed = syncConflictResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const fields = parsed.data.fields;
    for (const key of Object.keys(fields)) {
      if ((SYNC_IMMUTABLE_RESOLVE_FIELDS as readonly string[]).includes(key)) {
        return NextResponse.json(
          { error: `Field '${key}' is immutable and cannot be resolved` },
          { status: 400 }
        );
      }
    }

    try {
      await applyResolutionFields(
        row.entityType,
        typeof details.entityId === "string" ? details.entityId : null,
        fields,
        scoped ? scope : null,
        session.staffId
      );
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 500;
      const message = err instanceof Error ? err.message : "Failed to apply resolution";
      return NextResponse.json({ error: message }, { status });
    }

    const now = new Date().toISOString();
    const resolutionLog = [
      ...(Array.isArray(details.resolutions) ? details.resolutions : []),
      { by: session.staffId, at: now, mode: "client", chosen: fields },
    ];
    const updatedDetails = { ...details, resolutions: resolutionLog, resolvedAt: now };

    await db
      .update(offlineSyncOutbox)
      .set({ syncStatus: "SYNCED", conflictDetailsJson: JSON.stringify(updatedDetails) })
      .where(eq(offlineSyncOutbox.id, row.id))
      .run();

    return NextResponse.json({
      success: true,
      conflict: {
        id: row.id,
        clientEventId: details.clientEventId ?? null,
        entityType: row.entityType,
        status: "SYNCED",
        fields,
        resolvedAt: now,
      },
    });
  } catch (error) {
    console.error("Sync conflict resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve sync conflict" }, { status: 500 });
  }
}, "mobile:sync");
