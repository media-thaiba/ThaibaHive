import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (_request: Request) => {
  const rows = await db
    .select()
    .from(academicYears)
    .orderBy(academicYears.startDate)
    .all();

  return NextResponse.json({ academicYears: rows });
}, "academic_years:manage");

export const POST = requireAuth(async (request: Request) => {
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
