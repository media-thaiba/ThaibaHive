import { db } from "@/db";
import {
  attendanceLogs,
  bookings,
  expenseClaims,
  financialReconciliationItems,
  leaveRequests,
  purchaseRequests,
  tasks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { EntityRecord } from "@/lib/offline/sync-conflict-resolver";

/** LWW clock skew guard: clients cannot steer conflict resolution past 7 days. */
export const SYNC_CLOCK_SKEW_MS = 7 * 24 * 60 * 60 * 1000;

export interface SyncActorScope {
  staffId: string;
  role: string;
  institutionId?: string | null;
}

export function syncActorScope(ctx: SyncActorScope): string | null {
  return ctx.institutionId && ctx.institutionId !== "global" ? ctx.institutionId : null;
}

/**
 * Clamp a client-supplied mutation timestamp into [serverNow - 7d, serverNow].
 * Unparseable timestamps collapse to serverNow (fail-safe, never future).
 */
export function clampClientTimestamp(raw: string, nowMs: number = Date.now()): string {
  const parsed = Date.parse(raw);
  const ts = Number.isNaN(parsed)
    ? nowMs
    : Math.min(Math.max(parsed, nowMs - SYNC_CLOCK_SKEW_MS), nowMs);
  return new Date(ts).toISOString();
}

/**
 * Extract the domain entity id a mutation targets (null for pure CREATEs).
 * `attendance_punch` keys on the event DATE (attendance logs are looked up by
 * staffId + date, not by row id).
 */
export function extractSyncEntityId(
  action: string,
  payload: Record<string, unknown>
): string | null {
  switch (action) {
    case "finance_purchase_action":
      return typeof payload.purchaseRequestId === "string" && payload.purchaseRequestId
        ? payload.purchaseRequestId
        : null;
    case "finance_reconciliation_match":
      return typeof payload.itemId === "string" && payload.itemId ? payload.itemId : null;
    case "attendance_punch": {
      const at = typeof payload.at === "string" ? payload.at : null;
      if (!at) return null;
      return at.split("T")[0] || null;
    }
    case "leave_apply":
    case "task_create":
    case "expense_create":
    case "attendance_nfc_checkin":
      return null; // CREATE — no server record to compare against
    default:
      if (typeof payload.id === "string" && payload.id) return payload.id;
      return null;
  }
}

function toRecord(
  entityType: string,
  entityId: string,
  scope: string | null,
  row: Record<string, unknown>
): EntityRecord {
  const updatedAt =
    (typeof row.updatedAt === "string" && row.updatedAt) ||
    (typeof row.createdAt === "string" && row.createdAt) ||
    new Date().toISOString();
  return {
    id: entityId,
    tenantId: (typeof row.institutionId === "string" && row.institutionId) || scope || "global",
    entityType,
    data: row,
    updatedAt,
  };
}

type Row = Record<string, unknown>;

/**
 * Fetch the session+tenant-scoped server record for a mutation's entity so the
 * conflict resolver can compare clocks. Returns undefined when nothing exists
 * (CREATE path) or the entity is outside the caller's scope (treated as absent
 * — appliers re-check ownership independently).
 */
export async function fetchSyncServerRecord(
  entityType: string,
  entityId: string,
  ctx: SyncActorScope,
  payload: Record<string, unknown> = {}
): Promise<EntityRecord | undefined> {
  const scope = syncActorScope(ctx);

  switch (entityType) {
    case "attendance": {
      const row = await db
        .select()
        .from(attendanceLogs)
        .where(and(eq(attendanceLogs.staffId, ctx.staffId), eq(attendanceLogs.date, entityId)))
        .get();
      return row
        ? {
            id: row.id,
            tenantId: scope || "global",
            entityType,
            data: row as unknown as Row,
            // attendanceLogs has no updatedAt — resolver clock falls back to createdAt
            updatedAt: row.createdAt || row.checkIn || new Date().toISOString(),
          }
        : undefined;
    }
    case "task": {
      const row = await db
        .select()
        .from(tasks)
        .where(scope ? and(eq(tasks.id, entityId), eq(tasks.institutionId, scope)) : eq(tasks.id, entityId))
        .get();
      return row ? toRecord("task", entityId, scope, row as unknown as Row) : undefined;
    }
    case "leave": {
      const row = await db
        .select()
        .from(leaveRequests)
        .where(
          scope
            ? and(eq(leaveRequests.id, entityId), eq(leaveRequests.institutionId, scope))
            : eq(leaveRequests.id, entityId)
        )
        .get();
      if (!row || row.staffId !== ctx.staffId) return undefined; // personal rows only
      return toRecord("leave", entityId, scope, row as unknown as Row);
    }
    case "expense": {
      const row = await db
        .select()
        .from(expenseClaims)
        .where(
          scope
            ? and(eq(expenseClaims.id, entityId), eq(expenseClaims.institutionId, scope))
            : eq(expenseClaims.id, entityId)
        )
        .get();
      if (!row || row.staffId !== ctx.staffId) return undefined;
      return toRecord("expense", entityId, scope, row as unknown as Row);
    }
    case "purchase": {
      const row = await db
        .select()
        .from(purchaseRequests)
        .where(
          scope
            ? and(eq(purchaseRequests.id, entityId), eq(purchaseRequests.institutionId, scope))
            : eq(purchaseRequests.id, entityId)
        )
        .get();
      return row ? toRecord("purchase", entityId, scope, row as unknown as Row) : undefined;
    }
    case "reconciliation_item": {
      const row = await db
        .select()
        .from(financialReconciliationItems)
        .where(eq(financialReconciliationItems.id, entityId))
        .get();
      return row
        ? toRecord("reconciliation_item", entityId, scope, row as unknown as Row)
        : undefined;
    }
    case "approval": {
      const targetType = typeof payload.type === "string" ? payload.type : "";
      if (targetType === "leave") return fetchSyncServerRecord("leave", entityId, ctx, payload);
      if (targetType === "expense") return fetchSyncServerRecord("expense", entityId, ctx, payload);
      if (targetType === "purchase") return fetchSyncServerRecord("purchase", entityId, ctx, payload);
      if (targetType === "booking") {
        const row = await db
          .select()
          .from(bookings)
          .where(
            scope ? and(eq(bookings.id, entityId), eq(bookings.institutionId, scope)) : eq(bookings.id, entityId)
          )
          .get();
        return row ? toRecord("approval", entityId, scope, row as unknown as Row) : undefined;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
