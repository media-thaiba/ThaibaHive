import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, asc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.name)).all();
  return NextResponse.json({ departments: all });
}, "announcements:read");