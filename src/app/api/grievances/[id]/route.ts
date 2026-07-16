import { NextResponse } from "next/server";
import { db } from "@/db";
import { grievances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const role = session.role;

  if (role !== "super_admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, response } = body;

  const updateData: Record<string, string | null> = {};
  if (status) updateData.status = status;
  if (response !== undefined) updateData.response = response;
  updateData.respondedById = session.staffId;
  updateData.respondedAt = new Date().toISOString();

  const updated = await db
    .update(grievances)
    .set(updateData)
    .where(eq(grievances.id, id))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ grievance: updated });
});
