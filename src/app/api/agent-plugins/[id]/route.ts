import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent-plugins/[id]
 * Get plugin details with visibility check.
 */
export const GET = requireAuth(async (request: Request, session: any, context?: any) => {
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

  try {
    const plugin = await marketplaceEngine.getPlugin(pluginId, {
      userId: session.staffId,
      role: session.role,
      institutionId: institutionId || undefined,
    });

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({ plugin });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve plugin" },
      { status: 500 }
    );
  }
}, "marketplace:plugins:read");

/**
 * DELETE /api/agent-plugins/[id]
 * Deprecate a plugin.
 */
export const DELETE = requireAuth(async (request: Request, session: any, context?: any) => {
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

  try {
    const plugin = await marketplaceEngine.deprecatePlugin(pluginId, {
      userId: session.staffId,
      role: session.role,
      institutionId: institutionId || undefined,
    });

    return NextResponse.json({ success: true, plugin });
  } catch (error: any) {
    const status = error.message.includes("Forbidden")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}, "marketplace:plugins:publish");
