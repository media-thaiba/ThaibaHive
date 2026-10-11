import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { agentPluginInstallSchema } from "@/lib/validation/schemas";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent-plugins/[id]/install
 * Install plugin for the caller's institution with capability gating.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required for plugin installation" },
      { status: 400 }
    );
  }

  if (!isFeatureEnabled("marketplace", institutionId)) {
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

  let body: any = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = agentPluginInstallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const installation = await marketplaceEngine.installPlugin(
      pluginId,
      {
        userId: session.staffId,
        role: session.role,
        institutionId,
      },
      parsed.data
    );

    return NextResponse.json({ installation }, { status: 200 });
  } catch (error: any) {
    if (error.message.includes("Privilege escalation denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}, "marketplace:install");

/**
 * DELETE /api/agent-plugins/[id]/install
 * Uninstall plugin for the caller's institution. Returns 404 if not installed.
 */
export const DELETE = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required for plugin uninstallation" },
      { status: 400 }
    );
  }

  if (!isFeatureEnabled("marketplace", institutionId)) {
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
    await marketplaceEngine.uninstallPlugin(pluginId, institutionId, session.staffId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes("not installed")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}, "marketplace:uninstall");
