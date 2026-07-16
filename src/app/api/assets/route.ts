import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { assetCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const institutionId = searchParams.get("institutionId");

  const conditions = [eq(assets.isActive, true)];
  if (type) conditions.push(eq(assets.type, type));
  if (status) conditions.push(eq(assets.status, status));
  if (institutionId) conditions.push(eq(assets.institutionId, institutionId));

  // Staff (non-admin/hod/principal) only see assets assigned to them
  const isAdminRole = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isAdminRole) {
    conditions.push(eq(assets.assignedToId, session.staffId));
  }

  const all = await db
    .select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      model: assets.model,
      serialNumber: assets.serialNumber,
      institutionId: assets.institutionId,
      assignedToId: assets.assignedToId,
      assignedToName: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
      location: assets.location,
      purchaseDate: assets.purchaseDate,
      purchaseCost: assets.purchaseCost,
      warrantyEnd: assets.warrantyEnd,
      status: assets.status,
      qrCode: assets.qrCode,
      notes: assets.notes,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(staff, eq(assets.assignedToId, staff.id))
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt))
    .all();

  return NextResponse.json({ assets: all });
}, "assets:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = assetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, type, model, serialNumber, institutionId, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status, notes } = parsed.data;
  const asset = await db.insert(assets).values({
    id: crypto.randomUUID(),
    name,
    type,
    model,
    serialNumber,
    institutionId,
    assignedToId,
    location,
    purchaseDate,
    purchaseCost,
    warrantyEnd,
    status: status || "available",
    notes,
  }).returning().get();
  return NextResponse.json({ asset }, { status: 201 });
}, "assets:create");