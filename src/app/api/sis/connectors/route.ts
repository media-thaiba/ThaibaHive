import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { ConnectorRegistry } from "@/lib/sis/connector-registry";
import { isSisSyncEnabled } from "@/lib/features";
import { sisConnectorCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sis/connectors
 * List connectors for the tenant with masked credentials.
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
    return NextResponse.json({ error: "SIS sync feature is disabled" }, { status: 403 });
  }

  try {
    const connectors = await ConnectorRegistry.listConnectors(institutionId);
    const masked = await Promise.all(connectors.map((c) => ConnectorRegistry.toDto(c)));
    return NextResponse.json({ connectors: masked });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list connectors" }, { status: 500 });
  }
}, "sis:read");

/**
 * POST /api/sis/connectors
 * Create a new SIS connector for the tenant.
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
    body.institutionId ||
    searchParams.get("institutionId") ||
    request.headers.get("x-institution-id") ||
    (session.institutionId && session.institutionId !== "global" ? session.institutionId : undefined);
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isSisSyncEnabled(institutionId)) {
    return NextResponse.json({ error: "SIS sync feature is disabled" }, { status: 403 });
  }

  const parsed = sisConnectorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const created = await ConnectorRegistry.createConnector(institutionId, parsed.data);
    const masked = await ConnectorRegistry.toDto(created);
    return NextResponse.json({ connector: masked }, { status: 201 });
  } catch (err: any) {
    const msg = err.message || "Failed to create connector";
    const status = msg.includes("already exists") ? 409 : msg.includes("SSRF") || msg.includes("Invalid connector baseUrl") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}, "sis:manage");
