import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const existing = await db.select({ id: circulars.id }).from(circulars).where(eq(circulars.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(circulars).where(eq(circulars.id, id)).run();
  return NextResponse.json({ success: true });
}, "announcements:manage");
