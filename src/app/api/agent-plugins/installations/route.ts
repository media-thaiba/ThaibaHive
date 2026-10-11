import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent-plugins/installations
 * List installed plugins for the caller's institution.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to list installations" },
      { status: 400 }
    );
  }

  if (!isFeatureEnabled("marketplace", institutionId)) {
    return NextResponse.json(
      { error: "Marketplace feature is disabled" },
      { status: 403 }
    );
  }

  try {
    const installations = await marketplaceEngine.listInstallations(institutionId);
    return NextResponse.json({
      installations,
      total: installations.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list installations" },
      { status: 500 }
    );
  }
}, "marketplace:plugins:read");
