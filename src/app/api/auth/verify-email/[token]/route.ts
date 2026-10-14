import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/db";
import { staff, emailVerificationTokens } from "@thaiba/db/schema";
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
  if (!token || typeof token !== "string" || token.length < 16) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const tokenHash = hashToken(token);

  // Atomic single-use token consumption (anti-replay TOCTOU guard)
  const consumedToken = await db
    .update(emailVerificationTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, now)
      )
    )
    .returning()
    .get();

  if (!consumedToken) {
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
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
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }

  await db
    .update(staff)
    .set({ emailVerifiedAt: now, updatedAt: now })
    .where(eq(staff.id, consumedToken.staffId));

  return NextResponse.json({ success: true });
}
