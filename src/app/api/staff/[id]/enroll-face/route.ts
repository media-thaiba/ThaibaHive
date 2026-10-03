import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  if (session.staffId !== id && session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { image } = body as { image?: string };

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "image is required (base64)" }, { status: 400 });
  }

  const targetStaff = await db.select().from(staff).where(eq(staff.id, id)).get();
  if (!targetStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const mockEmbedding = image.slice(0, 100);

  await db
    .update(staff)
    .set({
      faceEmbedding: mockEmbedding,
      faceRegisteredAt: now,
      biometricEnabled: true,
      updatedAt: now,
    })
    .where(eq(staff.id, id))
    .run();

  return NextResponse.json({ success: true, enrolledAt: now });
}, "biometric:enroll");
