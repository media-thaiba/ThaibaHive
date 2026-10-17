import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookingResources } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, session) => {
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? eq(bookingResources.institutionId, scopedInstitutionId)
    : undefined;

  const query = db.select().from(bookingResources);
  const resources = whereClause
    ? await query.where(whereClause).orderBy(desc(bookingResources.createdAt)).all()
    : await query.orderBy(desc(bookingResources.createdAt)).all();

  return NextResponse.json({ resources });
}, "bookings:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { name, type, capacity, location, description } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const institutionId = scopedInstitutionId && scopedInstitutionId !== "global"
    ? scopedInstitutionId
    : (session.institutionId || "inst_default");

  const resource = await db.insert(bookingResources).values({
    id: crypto.randomUUID(),
    institutionId,
    name,
    type,
    capacity,
    location,
    description,
  }).returning().get();
  return NextResponse.json({ resource }, { status: 201 });
}, "bookings:manage");