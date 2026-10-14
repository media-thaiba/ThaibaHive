import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { ResourcePoolService } from "@/lib/cross-campus/resource-pool";
import { isSisSyncEnabled } from "@/lib/features";
import { resourcePoolCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cross-campus/pools
 * Lists shared physical resource pools.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
  const { searchParams } = new URL(request.url);
  const requestedInst =
    searchParams.get("institutionId") ||
    request.headers.get("x-institution-id") ||
    (session.institutionId && session.institutionId !== "global" ? session.institutionId : undefined);
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isSisSyncEnabled(institutionId)) {
    return NextResponse.json({ error: "Federation sync feature is disabled" }, { status: 403 });
  }

  const regionalGroupId = searchParams.get("regionalGroupId") || undefined;
  const homeInstitutionId = searchParams.get("homeInstitutionId") || undefined;
  const resourceType = searchParams.get("resourceType") || undefined;

  try {
    const pools = await ResourcePoolService.listPools({
      regionalGroupId,
      homeInstitutionId,
      resourceType,
    });
    return NextResponse.json({ pools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list resource pools" }, { status: 500 });
  }
}, "crosscampus:read");

/**
 * POST /api/cross-campus/pools
 * Creates a new shared resource pool for an institution.
 */
export const POST = requireAuth(async (request: Request, session: any) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requestedInst =
    body.homeInstitutionId ||
    searchParams.get("institutionId") ||
    request.headers.get("x-institution-id") ||
    (session.institutionId && session.institutionId !== "global" ? session.institutionId : undefined);
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isSisSyncEnabled(institutionId)) {
    return NextResponse.json({ error: "Federation sync feature is disabled" }, { status: 403 });
  }

  const parsed = resourcePoolCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const pool = await ResourcePoolService.createPool(institutionId, parsed.data);
    return NextResponse.json({ pool }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create resource pool" }, { status: 500 });
  }
}, "crosscampus:request");
