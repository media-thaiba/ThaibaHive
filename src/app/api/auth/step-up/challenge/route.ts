import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifySession } from "@thaiba/auth/session";
import { hasPermission } from "@thaiba/auth/roles";
import { db } from "@/db";
import { staff, credentialChallenges } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

const challengeSchema = z.object({
  action: z.enum(["session:terminate"]),
});

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rl = await checkDistributedRateLimit(ip, "step_up");
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

  const session = await verifySession();
  if (!session || !session.sid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = challengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  }

  const { action } = parsed.data;

  // 1. Fetch live staff record from DB
  const callerStaff = await db
    .select({
      id: staff.id,
      role: staff.role,
      isActive: staff.isActive,
    })
    .from(staff)
    .where(eq(staff.id, session.staffId))
    .get();

  if (!callerStaff || !callerStaff.isActive) {
    return NextResponse.json({ error: "Account inactive or not found" }, { status: 401 });
  }

  // 2. Permission check for action
  if (action === "session:terminate") {
    if (!hasPermission(callerStaff.role, "system:sessions:terminate")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for action" }, { status: 403 });
    }
  }

  const nowIso = new Date().toISOString();

  // 3. Purge expired step-up challenge rows for this staff member
  await db.delete(credentialChallenges).where(
    and(
      eq(credentialChallenges.staffId, callerStaff.id),
      sql`${credentialChallenges.type} LIKE 'step_up:%'`,
      sql`${credentialChallenges.expiresAt} <= ${nowIso}`
    )
  ).run();

  // 4. Cap pending active challenges at 3 per staff member
  const pendingChallenges = await db
    .select({ id: credentialChallenges.id })
    .from(credentialChallenges)
    .where(
      and(
        eq(credentialChallenges.staffId, callerStaff.id),
        sql`${credentialChallenges.type} LIKE 'step_up:%'`,
        gt(credentialChallenges.expiresAt, nowIso)
      )
    )
    .all();

  if (pendingChallenges.length >= 3) {
    return NextResponse.json(
      { error: "Too many pending challenges. Please wait for existing challenges to expire or verify." },
      { status: 429 }
    );
  }

  const challenge = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  // Bound to staffId, sid, and action
  await db.insert(credentialChallenges).values({
    id: `chal_stepup_${crypto.randomUUID()}`,
    staffId: callerStaff.id,
    challenge,
    type: `step_up:${action}:${session.sid}`,
    expiresAt,
  }).run();

  return NextResponse.json({
    challenge,
    expiresAt,
  });
}
