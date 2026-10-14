import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { ConnectorRegistry } from "@/lib/sis/connector-registry";
import { EgressGuard } from "@/lib/sis/egress-guard";
import { CredentialVault } from "@/lib/sis/credential-vault";
import { isSisSyncEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sis/connectors/[id]/test
 * Tests connectivity and SSRF compliance for a connector.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
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

  const params = await context?.params;
  const connectorId = params?.id;
  if (!connectorId) {
    return NextResponse.json({ error: "Connector ID required" }, { status: 400 });
  }

  const connector = await ConnectorRegistry.getConnector(institutionId, connectorId);
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  // 1. SSRF and Pinned IP test
  const egressCheck = await EgressGuard.validateEgressUrl(connector.baseUrl);
  if (!egressCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `SSRF validation failed: ${egressCheck.reason}`,
      },
      { status: 400 }
    );
  }

  // 2. Credential resolution test
  const hasSecret = await CredentialVault.hasCredential(connector.credentialRef);

  return NextResponse.json({
    success: true,
    message: "Connector endpoint passed SSRF and credential validation.",
    pinnedIp: egressCheck.pinnedIp,
    hasCredential: hasSecret,
  });
}, "sis:manage");
