import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { staff, passwordResetTokens, userSessions } from "@thaiba/db/schema";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@thaiba/auth";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(ip, "auth");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { token } = await params;

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse({
    password: body.password,
    confirmPassword: body.confirmPassword,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid password" },
      { status: 400 }
    );
  }

  const { password: newPassword } = parsed.data;
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const consumedToken = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .returning()
    .get();

  if (!consumedToken) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.id, consumedToken.staffId))
    .get();

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(newPassword);

  // Invalidate active sessions in user_sessions (Rule 20)
  await db
    .update(userSessions)
    .set({
      status: "terminated",
      logoutAt: Date.now(),
    })
    .where(and(eq(userSessions.staffId, consumedToken.staffId), eq(userSessions.status, "active")));

  await db
    .update(staff)
    .set({
      passwordHash: newHash,
      tokenVersion: sql`${staff.tokenVersion} + 1`,
      updatedAt: now,
    })
    .where(eq(staff.id, consumedToken.staffId));

  return NextResponse.json({ success: true });
}
