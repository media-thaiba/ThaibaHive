import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";

import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db.select().from(academicYears).$dynamic();
  if (scopedInstId !== "global") {
    query = query.where(eq(academicYears.institutionId, scopedInstId));
  }

  const rows = await query.orderBy(academicYears.startDate).all();

  return NextResponse.json({ academicYears: rows });
}, "academic_years:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { name, startDate, endDate, institutionId } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: "name, startDate, and endDate are required" }, { status: 400 });
  }

  const result = await db
    .insert(academicYears)
    .values({
      id: crypto.randomUUID(),
      name,
      startDate,
      endDate,
      institutionId,
    })
    .returning()
    .get();

  return NextResponse.json({ academicYear: result }, { status: 201 });
}, "academic_years:manage");
