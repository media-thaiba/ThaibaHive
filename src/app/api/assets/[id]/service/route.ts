import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetServiceHistory } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const records = await db
    .select()
    .from(assetServiceHistory)
    .where(eq(assetServiceHistory.assetId, id))
    .orderBy(desc(assetServiceHistory.serviceDate))
    .all();

  return NextResponse.json({ serviceHistory: records });
}, "assets:create");

export const POST = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
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
