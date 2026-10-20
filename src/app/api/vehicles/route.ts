import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, institutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { vehicleCreateSchema } from "@/lib/validation/schemas";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      type: vehicles.type,
      capacity: vehicles.capacity,
      fuelType: vehicles.fuelType,
      isActive: vehicles.isActive,
      institutionId: vehicles.institutionId,
      institutionName: institutions.name,
      notes: vehicles.notes,
    })
    .from(vehicles)
    .leftJoin(institutions, eq(vehicles.institutionId, institutions.id))
    .$dynamic();

  if (scopedInstId !== "global") {
    query = query.where(eq(vehicles.institutionId, scopedInstId));
  }

  const all = await query.orderBy(desc(vehicles.createdAt)).all();

  return NextResponse.json({ vehicles: all });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:create:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = vehicleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid vehicle parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { registrationNumber, model, type, capacity, fuelType, notes } = parsed.data;
  const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);

  // Check duplicate registrationNumber
  const existing = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.registrationNumber, registrationNumber))
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "Vehicle with this registration number already exists" },
      { status: 409 }
    );
  }

  const vehicle = await db
    .insert(vehicles)
    .values({
      id: crypto.randomUUID(),
      registrationNumber,
      model,
      type,
      capacity: capacity || 1,
      fuelType: fuelType || "petrol",
      institutionId: institutionId === "global" ? null : institutionId || null,
      notes: notes || null,
    })
    .returning()
    .get();

  await logActivity({
    request,
    action: "create",
    resourceType: "vehicle",
    resourceId: vehicle.id,
    staffId: session.staffId,
    details: { registrationNumber: vehicle.registrationNumber, model: vehicle.model },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}, "vehicles:manage");
