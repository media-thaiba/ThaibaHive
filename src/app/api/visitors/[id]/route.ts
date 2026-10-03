import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
    : eq(visitors.id, id);

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
      institutionId: visitors.institutionId,
      createdAt: visitors.createdAt,
    })
    .from(visitors)
    .leftJoin(staff, eq(visitors.hostStaffId, staff.id))
    .where(whereClause)
    .get();

  if (!visitor) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  return NextResponse.json({ visitor });
}, "visitors:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
    : eq(visitors.id, id);

  const existing = await db.select().from(visitors).where(whereClause).get();
  if (!existing) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  const body = await request.json();
  const { checkOut, status, notes } = body;

  const updateData: Record<string, string | null> = {};
  if (checkOut !== undefined) updateData.checkOut = checkOut;
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await db.update(visitors).set(updateData).where(whereClause).returning().get();
  if (!updated) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  return NextResponse.json({ visitor: updated });
}, "visitors:update");

export const DELETE = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
    : eq(visitors.id, id);

  const existing = await db.select().from(visitors).where(whereClause).get();
  if (!existing) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  await db.delete(visitors).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "visitors:manage");
