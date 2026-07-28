import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db";
import { staff, passwordResetTokens } from "@thaiba/db/schema";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function dummyTimingNoop(): Promise<void> {
  await db.select().from(staff).where(eq(staff.id, "__nonexistent__")).get();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  const rateLimit = checkRateLimit(email, "authForgotPassword");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const user = await db
    .select()
    .from(staff)
    .where(eq(staff.email, email.toLowerCase()))
    .get();

  if (user && user.isActive) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(
        and(
          eq(passwordResetTokens.staffId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.insert(passwordResetTokens).values({
      staffId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password/${token}`;
    waitUntil(
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(
        console.error
      )
    );
  } else {
    await dummyTimingNoop();
  }

  return NextResponse.json({ success: true });
}
