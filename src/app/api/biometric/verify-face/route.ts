import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";

function parseEmbedding(val: any): number[] | null {
  if (Array.isArray(val)) return val.map(Number);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      const parts = val.split(",").map((s) => parseFloat(s.trim()));
      if (parts.length > 1 && !parts.some(isNaN)) return parts;
    }
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const { staffId, embedding } = body as { staffId?: string; embedding?: any };

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

  const submittedVec = parseEmbedding(embedding);
  const enrolledVec = parseEmbedding(user.faceEmbedding);

  if (submittedVec && enrolledVec) {
    const similarity = cosineSimilarity(submittedVec, enrolledVec);
    const matched = similarity >= 0.85;
    return NextResponse.json({ matched, confidence: Math.max(0, Math.min(1, similarity)) });
  }

  const matched = typeof embedding === "string" && embedding === user.faceEmbedding;
  return NextResponse.json({ matched, confidence: matched ? 1.0 : 0.0 });
}, "attendance:manage");
