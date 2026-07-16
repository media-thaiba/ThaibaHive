import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { checkOut, status, notes } = body;

  const updateData: Record<string, string | null> = {};
  if (checkOut !== undefined) updateData.checkOut = checkOut;
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await db.update(visitors).set(updateData).where(eq(visitors.id, id)).returning().get();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ visitor: updated });
}, "visitors:update");
