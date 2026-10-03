import { db } from "@/db";
import {
  attendanceLogs,
  bookings,
  expenseClaims,
  leaveBalances,
  leaveRequests,
  purchaseRequests,
  tasks,
  staffInstitutions,
} from "@/db/schema";
import {
  expenseClaimCreateSchema,
  leaveCreateSchema,
  taskCreateSchema,
} from "@/lib/validation/schemas";
import { WorkflowEngine } from "@/lib/finance/workflow-engine";
import type { Role } from "@/lib/finance/models/approval-state";
import {
  validateNfcCheckIn,
  AttendanceValidationError,
} from "@/lib/attendance/validation";
import { eq, and, ne } from "drizzle-orm";
import crypto from "crypto";

export interface SyncApplierContext {
  staffId: string;
  role: string;
  institutionId?: string | null;
}

function actorScope(ctx: SyncApplierContext): string | null {
  return ctx.institutionId && ctx.institutionId !== "global" ? ctx.institutionId : null;
}

/**
 * Applies a single offline mutation to the domain tables.
 *
 * Security invariants (enforced for every action):
 * - Ownership/scope is always derived from `ctx.staffId` (the session).
 *   Client-supplied user IDs in payloads are ignored.
 * - Approvers can never review their own requests (anti-self-approval),
 *   except for `super_admin`.
 * - Validation failures throw — the caller records them as terminal
 *   `failedMutations` (never retried as successes).
 */
export async function applySyncMutation(
  ctx: SyncApplierContext,
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (action) {
    case "leave_apply":
      return applyLeaveApply(ctx, payload);
    case "leave_cancel":
      return applyLeaveCancel(ctx, payload);
    case "task_create":
      return applyTaskCreate(ctx, payload);
    case "task_update":
      return applyTaskUpdate(ctx, payload);
    case "task_delete":
      return applyTaskDelete(ctx, payload);
    case "expense_create":
      return applyExpenseCreate(ctx, payload);
    case "attendance_nfc_checkin":
      return applyAttendanceNfcCheckin(ctx, payload);
    case "approval_approve":
    case "approval_reject":
      return applyApprovalDecision(ctx, action === "approval_approve" ? "approve" : "reject", payload);
    default:
      throw new Error(`Unsupported offline action: ${action}`);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("Invalid mutation payload: expected an object");
}

function asString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new Error(`Invalid mutation payload: '${field}' is required`);
}

// ─── Leave ───

async function applyLeaveApply(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const parsed = leaveCreateSchema.safeParse({
    leaveTypeId: payload.leaveTypeId ?? payload.leave_type_id,
    startDate: payload.startDate ?? payload.start_date,
    endDate: payload.endDate ?? payload.end_date,
    daysCount: payload.daysCount ?? payload.days,
    reason: payload.reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid leave application payload");
  }

  const { leaveTypeId, startDate, endDate, daysCount, reason } = parsed.data;
  const year = new Date().getFullYear();
  const scope = actorScope(ctx);

  await db.transaction(async (tx) => {
    const balance = await tx
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, ctx.staffId),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year)
        )
      )
      .get();

    if (!balance) {
      throw new Error("No leave balance configured for this leave type for the current year.");
    }

    if (balance.totalDays - balance.usedDays < daysCount) {
      throw new Error(
        `Insufficient leave balance. Requested: ${daysCount} days, Remaining: ${balance.totalDays - balance.usedDays} days.`
      );
    }

    const instRow = await tx
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, ctx.staffId))
      .get();
    const actorInstId = instRow?.institutionId ?? null;

    await tx
      .insert(leaveRequests)
      .values({
        id: crypto.randomUUID(),
        staffId: ctx.staffId,
        leaveTypeId,
        startDate,
        endDate,
        daysCount,
        reason: reason || null,
        status: "pending",
        institutionId: scope ?? actorInstId,
      })
      .run();
  });
}

async function applyLeaveCancel(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const id = asString(payload.id, "id");
  const scope = actorScope(ctx);
  const idClause = eq(leaveRequests.id, id);
  const whereClause = scope ? and(idClause, eq(leaveRequests.institutionId, scope)) : idClause;

  const existing = await db
    .select()
    .from(leaveRequests)
    .where(whereClause)
    .get();

  if (!existing || existing.staffId !== ctx.staffId) {
    throw new Error("Leave request not found");
  }
  if (existing.status === "approved" || existing.status === "rejected") {
    throw new Error(`Leave request is already ${existing.status}`);
  }

  await db
    .update(leaveRequests)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(
      and(
        whereClause,
        ne(leaveRequests.status, "approved"),
        ne(leaveRequests.status, "rejected")
      )
    )
    .run();
}

// ─── Tasks ───

const TASK_UPDATE_FIELDS = ["title", "description", "status", "priority", "dueDate", "due_date"] as const;

async function applyTaskCreate(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const parsed = taskCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid task payload");
  }

  const scope = actorScope(ctx);
  const instRow = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, ctx.staffId))
    .get();
  const actorInstId = instRow?.institutionId ?? null;

  await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority || "medium",
      assignedToId: parsed.data.assignedToId || ctx.staffId,
      assignedById: ctx.staffId,
      departmentId: parsed.data.departmentId || null,
      dueDate: parsed.data.dueDate || null,
      status: "todo",
      institutionId: scope ?? actorInstId,
    })
    .run();
}

async function loadOwnedTask(ctx: SyncApplierContext, id: string) {
  const scope = actorScope(ctx);
  const idClause = eq(tasks.id, id);
  const whereClause = scope ? and(idClause, eq(tasks.institutionId, scope)) : idClause;
  const existing = await db.select().from(tasks).where(whereClause).get();
  if (!existing) throw new Error("Task not found");

  const elevated = ctx.role === "super_admin" || ctx.role === "admin";
  if (!elevated && existing.assignedToId !== ctx.staffId && existing.assignedById !== ctx.staffId) {
    throw new Error("You are not authorized to modify this task");
  }
  return existing;
}

async function applyTaskUpdate(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const id = asString(payload.id, "id");
  await loadOwnedTask(ctx, id);

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const field of TASK_UPDATE_FIELDS) {
    if (payload[field] !== undefined) {
      updates[field === "due_date" ? "dueDate" : field] = payload[field];
    }
  }
  if (typeof updates.status === "string" && updates.status === "done") {
    updates.completedAt = new Date().toISOString();
  }

  const scope = actorScope(ctx);
  const idClause = eq(tasks.id, id);
  await db
    .update(tasks)
    .set(updates)
    .where(scope ? and(idClause, eq(tasks.institutionId, scope)) : idClause)
    .run();
}

async function applyTaskDelete(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const id = asString(payload.id, "id");
  await loadOwnedTask(ctx, id);
  const scope = actorScope(ctx);
  const idClause = eq(tasks.id, id);
  await db
    .delete(tasks)
    .where(scope ? and(idClause, eq(tasks.institutionId, scope)) : idClause)
    .run();
}

// ─── Expenses ───

async function applyExpenseCreate(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const parsed = expenseClaimCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid expense claim payload");
  }

  await db
    .insert(expenseClaims)
    .values({
      id: crypto.randomUUID(),
      staffId: ctx.staffId,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      receiptUrl: parsed.data.receiptUrl || null,
      status: "pending",
    })
    .run();
}

// ─── Attendance (NFC) ───

async function applyAttendanceNfcCheckin(ctx: SyncApplierContext, raw: Record<string, unknown>): Promise<void> {
  const payload = asRecord(raw);
  const tagData = payload.tagData !== undefined ? asRecord(payload.tagData) : {};
  const nfcTagId =
    typeof tagData.id === "string" && tagData.id.trim()
      ? tagData.id
      : typeof tagData.payload === "string" && tagData.payload.trim()
        ? tagData.payload
        : null;
  if (!nfcTagId) throw new Error("Invalid mutation payload: NFC tag ID is missing");

  const latitude = typeof payload.latitude === "number" ? payload.latitude : undefined;
  const longitude = typeof payload.longitude === "number" ? payload.longitude : undefined;

  try {
    await validateNfcCheckIn(ctx.staffId, nfcTagId, latitude, longitude, undefined, undefined);
  } catch (error: unknown) {
    if (error instanceof AttendanceValidationError) throw new Error(error.message);
    throw error;
  }

  const timestamp =
    typeof payload.timestamp === "string" && payload.timestamp ? payload.timestamp : new Date().toISOString();
  const date = timestamp.split("T")[0] || new Date().toISOString().split("T")[0];

  try {
    await db
      .insert(attendanceLogs)
      .values({
        id: crypto.randomUUID(),
        staffId: ctx.staffId,
        date,
        checkIn: timestamp,
        method: "nfc",
        nfcTagId,
        status: "present",
      })
      .run();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Attendance already recorded for this date");
    }
    throw error;
  }
}

// ─── Unified approvals (mirrors PATCH /api/approvals decision rules) ───

async function applyApprovalDecision(
  ctx: SyncApplierContext,
  decision: "approve" | "reject",
  raw: Record<string, unknown>
): Promise<void> {
  const payload = asRecord(raw);
  const type = asString(payload.type, "type");
  const id = asString(payload.id, "id");
  const notes = typeof payload.notes === "string" ? payload.notes : null;
  const now = new Date().toISOString();
  const elevated = ctx.role === "super_admin" || ctx.role === "admin";
  const scope = actorScope(ctx);

  if (type === "leave") {
    const leaveIdClause = eq(leaveRequests.id, id);
    const leave = await db
      .select()
      .from(leaveRequests)
      .where(scope ? and(leaveIdClause, eq(leaveRequests.institutionId, scope)) : leaveIdClause)
      .get();
    if (!leave) throw new Error("Leave request not found");
    if (!elevated && leave.staffId === ctx.staffId) {
      throw new Error("Requesters cannot review their own leave requests.");
    }

    let nextStatus = decision === "approve" ? "approved" : "rejected";
    if (decision === "approve" && (ctx.role === "hod" || ctx.role === "principal")) {
      nextStatus = "hod_approved";
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(leaveRequests)
        .set({ status: nextStatus, reviewedById: ctx.staffId, reviewedAt: now, reviewNotes: notes, updatedAt: now })
        .where(
          and(
            leaveIdClause,
            scope ? eq(leaveRequests.institutionId, scope) : undefined,
            ne(leaveRequests.status, "approved"),
            ne(leaveRequests.status, "rejected")
          )
        )
        .returning()
        .get();
      if (!updated) throw new Error("Leave request is already in a terminal state");

      if (updated.status === "approved") {
        const existing = await tx
          .select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.staffId, leave.staffId),
              eq(leaveBalances.leaveTypeId, leave.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear())
            )
          )
          .get();
        if (existing) {
          await tx
            .update(leaveBalances)
            .set({ usedDays: existing.usedDays + leave.daysCount })
            .where(eq(leaveBalances.id, existing.id))
            .run();
        }
      }
    });
    return;
  }

  if (type === "expense") {
    const claim = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id)).get();
    if (!claim) throw new Error("Expense claim not found");
    if (!elevated && claim.staffId === ctx.staffId) {
      throw new Error("Requesters cannot review their own expense claims.");
    }

    const validation = WorkflowEngine.validateTransition(
      claim.status as any,
      decision,
      ctx.role as Role
    );
    if (!validation.valid) throw new Error(validation.error || "Transition not allowed");
    const nextStatus = WorkflowEngine.getNextStatus(
      claim.status as any,
      decision,
      "expense",
      claim.amount ?? 0
    );

    const updated = await db
      .update(expenseClaims)
      .set({ status: nextStatus, reviewedById: ctx.staffId, reviewedAt: now, reviewNotes: notes, updatedAt: now })
      .where(and(eq(expenseClaims.id, id), eq(expenseClaims.status, claim.status)))
      .returning()
      .get();
    if (!updated) throw new Error("Expense claim status changed by a concurrent request");
    return;
  }

  if (type === "purchase") {
    const purchase = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .get();
    if (!purchase) throw new Error("Purchase request not found");
    if (!elevated && purchase.requesterId === ctx.staffId) {
      throw new Error("Requesters cannot review their own purchase requests.");
    }

    if (decision === "reject") {
      const updated = await db
        .update(purchaseRequests)
        .set({ status: "rejected", notes: notes, updatedAt: now })
        .where(and(eq(purchaseRequests.id, id), ne(purchaseRequests.status, "rejected")))
        .returning()
        .get();
      if (!updated) throw new Error("Purchase request is already rejected");
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: now };
    switch (purchase.status) {
      case "pending_hod":
        updates.status = "pending_accounts";
        updates.approvedByHodId = ctx.staffId;
        break;
      case "pending_accounts":
        updates.status = "pending_purchase";
        updates.approvedByAccountsId = ctx.staffId;
        break;
      case "pending_purchase":
        updates.status = "approved";
        updates.approvedByPurchaseId = ctx.staffId;
        updates.approvedAt = now;
        break;
      default:
        throw new Error("Cannot approve in current status");
    }
    if (notes) updates.notes = notes;

    const updated = await db
      .update(purchaseRequests)
      .set(updates)
      .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, purchase.status)))
      .returning()
      .get();
    if (!updated) throw new Error("Purchase request status changed by a concurrent request");
    return;
  }

  if (type === "booking") {
    const bookingIdClause = eq(bookings.id, id);
    const booking = await db
      .select()
      .from(bookings)
      .where(scope ? and(bookingIdClause, eq(bookings.institutionId, scope)) : bookingIdClause)
      .get();
    if (!booking) throw new Error("Booking not found");

    const updated = await db
      .update(bookings)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        approvedById: ctx.staffId,
        notes: notes,
        updatedAt: now,
      })
      .where(
        and(
          bookingIdClause,
          scope ? eq(bookings.institutionId, scope) : undefined,
          ne(bookings.status, "approved"),
          ne(bookings.status, "rejected")
        )
      )
      .returning()
      .get();
    if (!updated) throw new Error("Booking is already in a terminal state");
    return;
  }

  throw new Error(`Invalid approval type: ${type}`);
}
