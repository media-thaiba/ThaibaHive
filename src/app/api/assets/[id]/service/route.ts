import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, assetServiceHistory } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (
    !asset ||
    (asset.institutionId &&
      scopedInstId &&
      scopedInstId !== "global" &&
      asset.institutionId !== scopedInstId)
  ) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const records = await db
    .select()
    .from(assetServiceHistory)
    .where(eq(assetServiceHistory.assetId, id))
    .orderBy(desc(assetServiceHistory.serviceDate))
    .all();

  return NextResponse.json({ serviceHistory: records });
}, "assets:read");

export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);

  const asset = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (
    !asset ||
    (asset.institutionId &&
      scopedInstId &&
      scopedInstId !== "global" &&
      asset.institutionId !== scopedInstId)
  ) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { serviceDate, description, cost, servicedBy, notes } = body;

  if (!serviceDate || !description) {
    return NextResponse.json({ error: "Service date and description are required" }, { status: 400 });
  }

  const record = await db
    .insert(assetServiceHistory)
    .values({
      id: crypto.randomUUID(),
      assetId: id,
      serviceDate,
      description,
      cost: cost ? Number(cost) : null,
      servicedBy,
      notes,
    })
    .returning()
    .get();

  return NextResponse.json({ serviceRecord: record }, { status: 201 });
}, "assets:update");
