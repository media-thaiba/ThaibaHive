import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { visitorCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const conditions = [];

  if (status) conditions.push(eq(visitors.status, status));
  if (date) conditions.push(sql`date(${visitors.checkIn}) = ${date}`);

  const result = await db
    .select({
      id: visitors.id,
      name: visitors.name,
      contact: visitors.contact,
      idType: visitors.idType,
      idNumber: visitors.idNumber,
      hostStaffId: visitors.hostStaffId,
      hostStaffName: staff.firstName,
      hostStaffLastName: staff.lastName,
      purpose: visitors.purpose,
      checkIn: visitors.checkIn,
      checkOut: visitors.checkOut,
      status: visitors.status,
      notes: visitors.notes,
      createdAt: visitors.createdAt,
    })
    .from(visitors)
    .leftJoin(staff, eq(visitors.hostStaffId, staff.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visitors.checkIn))
    .all();

  return NextResponse.json({ visitors: result });
}, "visitors:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = visitorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid visitor parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { name, contact, idType, idNumber, hostStaffId, purpose, notes } = parsed.data;

  const visitor = await db
    .insert(visitors)
    .values({
      id: crypto.randomUUID(),
      name,
      contact: contact || null,
      idType: idType || null,
      idNumber: idNumber || null,
      hostStaffId: hostStaffId || null,
      purpose,
      notes: notes || null,
      checkIn: new Date().toISOString(),
      status: "checked_in",
    })
    .returning()
    .get();

  return NextResponse.json({ visitor }, { status: 201 });
}, "visitors:create");