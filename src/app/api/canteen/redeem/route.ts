import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses, canteenTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { canteenRedeemSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = canteenRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid redemption payload", details: parsed.error.format() }, { status: 400 });
  }

  const { passCode, items, idempotencyKey } = parsed.data;

  if (idempotencyKey) {
    const existingTx = await db
      .select()
      .from(canteenTransactions)
      .where(eq(canteenTransactions.idempotencyKey, idempotencyKey))
      .get();
    if (existingTx) {
      return NextResponse.json({
        success: true,
        transactionId: existingTx.id,
        deductedAmount: existingTx.totalAmount,
        status: "already_processed",
      });
    }
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const pass = await db
    .select()
    .from(canteenMealPasses)
    .where(eq(canteenMealPasses.passCode, passCode))
    .get();

  if (!pass) {
    return NextResponse.json({ error: "Invalid or unassigned meal pass QR code" }, { status: 404 });
  }

  if (pass.status !== "active") {
    return NextResponse.json({ error: `Meal pass is ${pass.status}` }, { status: 400 });
  }

  if (pass.balance < totalAmount) {
    return NextResponse.json({ error: "Insufficient meal pass balance" }, { status: 400 });
  }

  const transactionId = crypto.randomUUID();
  const remainingBalance = pass.balance - totalAmount;

  await db.transaction(async (tx) => {
    await tx
      .update(canteenMealPasses)
      .set({
        balance: remainingBalance,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(canteenMealPasses.id, pass.id))
      .run();

    await tx
      .insert(canteenTransactions)
      .values({
        id: transactionId,
        institutionId: pass.institutionId,
        passId: pass.id,
        passCode,
        userId: pass.userId,
        itemsJson: JSON.stringify(items),
        totalAmount,
        idempotencyKey: idempotencyKey || null,
        cashierStaffId: session.staffId,
        status: "completed",
      })
      .run();
  });

  return NextResponse.json({
    success: true,
    transactionId,
    deductedAmount: totalAmount,
    remainingBalance,
    timestamp: new Date().toISOString(),
  });
}, "canteen:redeem");
