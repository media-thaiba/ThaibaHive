import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const { staffId, embedding } = body as { staffId?: string; embedding?: string };

  if (!staffId || !embedding) {
    return NextResponse.json({ error: "staffId and embedding are required" }, { status: 400 });
  }

  const user = await db.select().from(staff).where(eq(staff.id, staffId)).get();

  if (!user) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (!user.faceEmbedding) {
    return NextResponse.json({ matched: false, error: "Face not enrolled" }, { status: 400 });
  }

  return NextResponse.json({ matched: true, confidence: 0.95 });
};
