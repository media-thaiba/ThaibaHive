import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, asc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db.select({ id: institutions.id, name: institutions.name }).from(institutions).where(eq(institutions.isActive, true)).orderBy(asc(institutions.name)).all();
  return NextResponse.json({ institutions: all });
}, "announcements:read");