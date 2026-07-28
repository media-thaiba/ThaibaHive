import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { staff, passwordResetTokens } from "@thaiba/db/schema";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@thaiba/auth";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse({
    ...body,
    token,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { password: newPassword } = parsed.data;

  const now = new Date().toISOString();
  const tokenHash = hashToken(token);

  const validRecord = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .get();

  if (!validRecord) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.id, validRecord.staffId))
    .get();

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(newPassword);
  await db
    .update(staff)
    .set({
      passwordHash: newHash,
      tokenVersion: sql`${staff.tokenVersion} + 1`,
      updatedAt: now,
    })
    .where(eq(staff.id, validRecord.staffId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, validRecord.id));

  return NextResponse.json({ success: true });
}
