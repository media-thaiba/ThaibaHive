import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const visitor = await db
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
    .where(eq(visitors.id, id))
    .get();

  if (!visitor) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  return NextResponse.json({ visitor });
}, "visitors:read");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const body = await request.json();
  const { checkOut, status, notes } = body;

  const updateData: Record<string, string | null> = {};
  if (checkOut !== undefined) updateData.checkOut = checkOut;
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await db.update(visitors).set(updateData).where(eq(visitors.id, id)).returning().get();
  if (!updated) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  return NextResponse.json({ visitor: updated });
}, "visitors:update");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const existing = await db.select().from(visitors).where(eq(visitors.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  await db.delete(visitors).where(eq(visitors.id, id)).run();
  return NextResponse.json({ success: true });
}, "visitors:manage");
