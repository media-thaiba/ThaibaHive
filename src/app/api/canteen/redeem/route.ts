import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses, canteenMenus, canteenTransactions } from "@/db/schema";
import { requireAuth, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { canteenRedeemSchema } from "@/lib/validation/schemas";
import { isUniqueConstraintViolation } from "@/lib/api/sqlite-errors";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

const NOT_FOUND_MSG = "Invalid or unassigned meal pass QR code";

/**
 * Serializes redemption processing. The SQLite/libsql driver multiplexes one
 * connection, so overlapping interactive transactions fail with nested-BEGIN
 * errors and the balance read-then-write window races (overdraft / phantom
 * double-spend). Per-process queue removes both; the optimistic balance lock
 * inside the transaction still guards multi-instance PostgreSQL deployments.
 */
let redeemQueue: Promise<unknown> = Promise.resolve();
function withRedeemLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = redeemQueue.then(fn, fn);
  redeemQueue = run.then(() => undefined, () => undefined);
  return run;
}

function currentMealType(date: Date): "breakfast" | "lunch" | "snacks" | null {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 6 * 60 && minutes < 10 * 60 + 30) return "breakfast";
  if (minutes >= 10 * 60 + 30 && minutes < 16 * 60) return "lunch";
  if (minutes >= 16 * 60 && minutes < 21 * 60) return "snacks";
  return null;
}

function isIdempotencyKeyViolation(error: unknown): boolean {
  return isUniqueConstraintViolation(error, "idempotency");
}

async function handleRedeem(request: Request, session: SessionPayload) {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = canteenRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid redemption payload", details: parsed.error.format() }, { status: 400 });
  }

  const { passCode, items, idempotencyKey } = parsed.data;
  const allowedInstitutions = await resolveScopedInstitutions(session);
  const scopeIsGlobal = allowedInstitutions.includes("global");

  const replayResponse = (existing: { id: string; totalAmount: number }) =>
    NextResponse.json({
      success: true,
      transactionId: existing.id,
      deductedAmount: existing.totalAmount,
      status: "already_processed",
    });

  if (idempotencyKey) {
    const keyWhere = eq(canteenTransactions.idempotencyKey, idempotencyKey);
    const existing = await db
      .select()
      .from(canteenTransactions)
      .where(scopeIsGlobal ? keyWhere : and(keyWhere, inArray(canteenTransactions.institutionId, allowedInstitutions)))
      .get();
    if (existing) {
      return replayResponse(existing);
    }
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const codeWhere = eq(canteenMealPasses.passCode, passCode);
  const pass = await db
    .select()
    .from(canteenMealPasses)
    .where(scopeIsGlobal ? codeWhere : and(codeWhere, inArray(canteenMealPasses.institutionId, allowedInstitutions)))
    .get();

  if (!pass) {
    return NextResponse.json({ error: NOT_FOUND_MSG }, { status: 404 });
  }

  if (pass.status !== "active") {
    return NextResponse.json({ error: `Meal pass is ${pass.status}` }, { status: 400 });
  }

  const mealType = currentMealType(new Date());
  if (!mealType) {
    return NextResponse.json({ error: "Canteen is closed at this time" }, { status: 400 });
  }
  const today = new Date().toISOString().split("T")[0];
  const activeMenu = await db
    .select({ id: canteenMenus.id })
    .from(canteenMenus)
    .where(
      and(
        eq(canteenMenus.institutionId, pass.institutionId),
        eq(canteenMenus.date, today),
        eq(canteenMenus.mealType, mealType),
        eq(canteenMenus.isActive, true)
      )
    )
    .get();
  if (!activeMenu) {
    return NextResponse.json({ error: `No active ${mealType} menu is published for today` }, { status: 400 });
  }

  const transactionId = crypto.randomUUID();
  let outcome:
    | { ok: true; remainingBalance: number }
    | { ok: false; error: string; status: number }
    | undefined;

  try {
    await db.transaction(async (tx) => {
      // Authoritative checks inside the transaction: re-read the pass, enforce
      // the daily limit, then deduct with an optimistic lock on the exact
      // balance that was validated (and status still "active").
      const fresh = await tx
        .select()
        .from(canteenMealPasses)
        .where(eq(canteenMealPasses.id, pass.id))
        .get();

      if (!fresh) {
        outcome = { ok: false, error: NOT_FOUND_MSG, status: 404 };
        return;
      }
      if (fresh.status !== "active") {
        outcome = { ok: false, error: `Meal pass is ${fresh.status}`, status: 400 };
        return;
      }
      if (fresh.balance < totalAmount) {
        outcome = { ok: false, error: "Insufficient meal pass balance", status: 400 };
        return;
      }

      if (fresh.dailyLimit != null) {
        const todayRows = await tx
          .select({ total: canteenTransactions.totalAmount })
          .from(canteenTransactions)
          .where(
            and(
              eq(canteenTransactions.passId, fresh.id),
              eq(canteenTransactions.status, "completed"),
              // Dialect-portable ISO date prefix match (works in both SQLite and PostgreSQL)
              sql`substr(${canteenTransactions.createdAt}, 1, 10) = ${today}`
            )
          )
          .all();
        const spentToday = todayRows.reduce((sum, row) => sum + row.total, 0);
        if (spentToday + totalAmount > fresh.dailyLimit) {
          outcome = { ok: false, error: `Daily limit of ${fresh.dailyLimit} exceeded for today`, status: 400 };
          return;
        }
      }

      const remainingBalance = fresh.balance - totalAmount;
      await tx
        .update(canteenMealPasses)
        .set({ balance: remainingBalance, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(canteenMealPasses.id, fresh.id),
            eq(canteenMealPasses.status, "active"),
            eq(canteenMealPasses.balance, fresh.balance)
          )
        )
        .run();

      const verified = await tx
        .select({ balance: canteenMealPasses.balance })
        .from(canteenMealPasses)
        .where(eq(canteenMealPasses.id, fresh.id))
        .get();
      if (!verified || verified.balance !== remainingBalance) {
        outcome = { ok: false, error: "Insufficient meal pass balance", status: 400 };
        return;
      }

      await tx
        .insert(canteenTransactions)
        .values({
          id: transactionId,
          institutionId: fresh.institutionId,
          passId: fresh.id,
          passCode,
          userId: fresh.userId,
          itemsJson: JSON.stringify(items),
          totalAmount,
          idempotencyKey: idempotencyKey || null,
          cashierStaffId: session.staffId,
          status: "completed",
        })
        .run();

      outcome = { ok: true, remainingBalance };
    });
  } catch (error) {
    if (idempotencyKey && isIdempotencyKeyViolation(error)) {
      // Another writer committed this key first (cross-instance race). The
      // failed transaction already rolled back, so nothing was deducted twice.
      const keyWhere = eq(canteenTransactions.idempotencyKey, idempotencyKey);
      const existing = await db
        .select()
        .from(canteenTransactions)
        .where(scopeIsGlobal ? keyWhere : and(keyWhere, inArray(canteenTransactions.institutionId, allowedInstitutions)))
        .get();
      if (existing) {
        return replayResponse(existing);
      }
      return NextResponse.json({ error: "Idempotency key already used" }, { status: 409 });
    }
    throw error;
  }

  if (outcome?.ok) {
    return NextResponse.json({
      success: true,
      transactionId,
      deductedAmount: totalAmount,
      remainingBalance: outcome.remainingBalance,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { error: outcome && !outcome.ok ? outcome.error : "Redemption failed" },
    { status: outcome && !outcome.ok ? outcome.status : 500 }
  );
}

export const POST = requireAuth(
  (request: Request, session: SessionPayload) => withRedeemLock(() => handleRedeem(request, session)),
  "canteen:redeem"
);
