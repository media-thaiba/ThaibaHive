import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function deriveImageEmbedding(image: string): number[] {
  const digest = crypto.createHash("sha256").update(image).digest();
  const vec: number[] = [];
  for (let i = 0; i < 16; i++) {
    vec.push(Number(((digest[i] - 128) / 128).toFixed(6)));
  }
  return vec;
}

function normalizeEmbeddingInput(embedding?: unknown, image?: unknown): string | null {
  if (Array.isArray(embedding)) {
    const nums = embedding.map(Number);
    if (nums.length >= 2 && nums.every((n) => Number.isFinite(n))) {
      return JSON.stringify(nums);
    }
    return null;
  }
  if (typeof embedding === "string" && embedding.trim()) {
    try {
      const parsed = JSON.parse(embedding);
      if (Array.isArray(parsed)) {
        const nums = parsed.map(Number);
        if (nums.length >= 2 && nums.every((n) => Number.isFinite(n))) {
          return JSON.stringify(nums);
        }
      }
    } catch {
      const parts = embedding.split(",").map((s) => Number(s.trim()));
      if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
        return JSON.stringify(parts);
      }
    }
  }
  if (typeof image === "string" && image.trim()) {
    return JSON.stringify(deriveImageEmbedding(image.trim()));
  }
  return null;
}

export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  if (session.staffId !== id) {
    const hasAccess = await canAccessStaff(session.staffId, session.role, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const { image, embedding } = body as { image?: unknown; embedding?: unknown };

  const serializedEmbedding = normalizeEmbeddingInput(embedding, image);
  if (!serializedEmbedding) {
    return NextResponse.json(
      { error: "Valid face embedding vector or base64 image is required" },
      { status: 400 }
    );
  }

  const targetStaff = await db.select().from(staff).where(eq(staff.id, id)).get();
  if (!targetStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  await db
    .update(staff)
    .set({
      faceEmbedding: serializedEmbedding,
      faceRegisteredAt: now,
      biometricEnabled: true,
      updatedAt: now,
    })
    .where(eq(staff.id, id))
    .run();

  return NextResponse.json({ success: true, enrolledAt: now });
}, "biometric:enroll");
