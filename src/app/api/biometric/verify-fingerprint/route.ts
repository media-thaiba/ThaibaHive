import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import crypto from "crypto";

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const { staffId, templateHash } = body as { staffId?: string; templateHash?: string };

  if (!staffId || !templateHash) {
    return NextResponse.json({ error: "staffId and templateHash are required" }, { status: 400 });
  }

  const user = await db.select().from(staff).where(eq(staff.id, staffId)).get();

  if (!user) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (!user.fingerprintHash) {
    return NextResponse.json({ matched: false, error: "Fingerprint not enrolled" }, { status: 400 });
  }

  const submittedBuf = Buffer.from(templateHash);
  const enrolledBuf = Buffer.from(user.fingerprintHash);

  const matched =
    submittedBuf.length === enrolledBuf.length &&
    crypto.timingSafeEqual(submittedBuf, enrolledBuf);

  return NextResponse.json({ matched });
}, "attendance:manage");
