import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { assetCreateSchema } from "@/lib/validation/schemas";
import { verifyStaffInstitutionAffiliation } from "@/lib/assets/ledger";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const rawInst = searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, rawInst);

  const conditions = [eq(assets.isActive, true)];
  if (type) conditions.push(eq(assets.type, type));
  if (status) conditions.push(eq(assets.status, status));
  if (institutionId && institutionId !== "global") conditions.push(eq(assets.institutionId, institutionId));

  // Staff (non-manager) only see assets assigned to them
  const isManager = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isManager) {
    if (!session.staffId) {
      return NextResponse.json({ assets: [] });
    }
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

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`assets:create:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = assetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, type, model, serialNumber, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status, notes } = parsed.data;
  const rawInst = await resolveRequestInstitution(session, parsed.data.institutionId);
  const institutionId = rawInst === "global" ? null : rawInst || null;

  // Cross-tenant staff assignment check
  if (assignedToId) {
    const isAffiliated = await verifyStaffInstitutionAffiliation(assignedToId, institutionId);
    if (!isAffiliated) {
      return NextResponse.json(
        { error: "Assigned staff member does not exist or does not belong to this institution" },
        { status: 400 }
      );
    }
  }

  const asset = await db
    .insert(assets)
    .values({
      id: crypto.randomUUID(),
      name,
      type,
      model: model || null,
      serialNumber: serialNumber || null,
      institutionId,
      assignedToId: assignedToId || null,
      location: location || null,
      purchaseDate: purchaseDate || null,
      purchaseCost: purchaseCost ?? null,
      warrantyEnd: warrantyEnd || null,
      status: status || "available",
      notes: notes || null,
    })
    .returning()
    .get();

  await logActivity({
    request,
    action: "create",
    resourceType: "asset",
    resourceId: asset.id,
    staffId: session.staffId,
    details: { name: asset.name, type: asset.type, serialNumber: asset.serialNumber },
  });

  return NextResponse.json({ asset }, { status: 201 });
}, "assets:create");
