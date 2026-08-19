import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

export const POST = async (request: Request) => {
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

  return NextResponse.json({ matched: true });
};
