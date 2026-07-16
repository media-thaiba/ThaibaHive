import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, reviewNotes } = body;

  if (!["super_admin", "admin", "hod"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(expenseClaims)
    .set({
      status,
      reviewedById: session.staffId,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(expenseClaims.id, id))
    .returning()
    .get();

  return NextResponse.json({ claim: updated });
}, "finance:update");
