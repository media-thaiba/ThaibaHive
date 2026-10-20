import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  if (session.staffId !== id) {
    const hasAccess = await canAccessStaff(session.staffId, session.role, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { templateHash } = (body as { templateHash?: string }) || {};

  if (!templateHash || typeof templateHash !== "string" || !templateHash.trim() || templateHash.length > 2048) {
    return NextResponse.json({ error: "Valid templateHash (max 2048 chars) is required" }, { status: 400 });
  }

  const targetStaff = await db.select().from(staff).where(eq(staff.id, id)).get();
  if (!targetStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  await db
    .update(staff)
    .set({
      fingerprintHash: templateHash,
      fingerprintRegisteredAt: now,
      biometricEnabled: true,
      updatedAt: now,
    })
    .where(eq(staff.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "biometric:enroll");
