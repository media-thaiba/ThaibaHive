import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db";
import { staff, emailVerificationTokens } from "@thaiba/db/schema";
import { resendVerificationSchema } from "@/lib/validation/schemas";
import { checkDistributedRateLimit } from "@/lib/api/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function dummyTimingNoop(): Promise<void> {
  const dummyToken = crypto.randomBytes(32).toString("hex");
  hashToken(dummyToken);
  await db.select().from(staff).where(eq(staff.id, "__nonexistent__")).get();
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(emailVerificationTokens.id, "__nonexistent__"));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = resendVerificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  const rateLimit = await checkDistributedRateLimit(email, "authVerifyResend");
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

  if (user && user.isActive && !user.emailVerifiedAt) {
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(
        and(
          eq(emailVerificationTokens.staffId, user.id),
          isNull(emailVerificationTokens.usedAt)
        )
      );

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.insert(emailVerificationTokens).values({
      staffId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/auth/verify-email/${token}`;
    waitUntil(
      sendVerificationEmail(user.email, user.firstName, verifyUrl).catch(
        console.error
      )
    );
  } else {
    await dummyTimingNoop();
  }

  return NextResponse.json({ success: true });
}
