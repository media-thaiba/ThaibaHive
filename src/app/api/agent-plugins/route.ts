import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { agentPluginPublishSchema } from "@/lib/validation/schemas";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent-plugins
 * List plugins with tenant visibility rules.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!isFeatureEnabled("marketplace", institutionId || undefined)) {
    return NextResponse.json(
      { error: "Marketplace feature is disabled" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const scope = searchParams.get("scope") || undefined;
  const approvalStatus = searchParams.get("approvalStatus") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const plugins = await marketplaceEngine.listPlugins(
      {
        userId: session.staffId,
        role: session.role,
        institutionId: institutionId || undefined,
      },
      { category, scope, approvalStatus, search }
    );

    return NextResponse.json({
      plugins,
      total: plugins.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list plugins" },
      { status: 500 }
    );
  }
}, "marketplace:plugins:read");

/**
 * POST /api/agent-plugins
 * Publish a new plugin listing in pending_review status.
 */
export const POST = requireAuth(async (request: Request, session: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!isFeatureEnabled("marketplace", institutionId || undefined)) {
    return NextResponse.json(
      { error: "Marketplace feature is disabled" },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = agentPluginPublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const plugin = await marketplaceEngine.publishPlugin(parsed.data, {
      userId: session.staffId,
      role: session.role,
      institutionId: institutionId || undefined,
    });

    return NextResponse.json({ plugin }, { status: 201 });
  } catch (error: any) {
    const status = error.message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}, "marketplace:plugins:publish");
