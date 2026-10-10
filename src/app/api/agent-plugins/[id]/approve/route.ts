import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { agentPluginApproveSchema } from "@/lib/validation/schemas";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent-plugins/[id]/approve
 * Approve or reject a plugin listing.
 * Global plugins can only be approved by super_admin or system.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!isFeatureEnabled("marketplace", institutionId || undefined)) {
    return NextResponse.json(
      { error: "Marketplace feature is disabled" },
      { status: 403 }
    );
  }

  const params = await context?.params;
  const pluginId = params?.id;

  if (!pluginId) {
    return NextResponse.json({ error: "Plugin ID is required" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = agentPluginApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const plugin = await marketplaceEngine.approvePlugin(
      pluginId,
      {
        userId: session.staffId,
        role: session.role,
        institutionId: institutionId || undefined,
      },
      parsed.data.action,
      parsed.data.reason
    );

    return NextResponse.json({ success: true, plugin });
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}, "marketplace:plugins:approve");
