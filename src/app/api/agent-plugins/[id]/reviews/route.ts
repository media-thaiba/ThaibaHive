import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { marketplaceEngine } from "@/lib/marketplace/plugin-engine";
import { agentPluginReviewSchema } from "@/lib/validation/schemas";
import { isFeatureEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent-plugins/[id]/reviews
 * Get reviews for a plugin.
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
    const reviews = await marketplaceEngine.getReviews(pluginId);
    return NextResponse.json({ reviews, total: reviews.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve reviews" },
      { status: 500 }
    );
  }
}, "marketplace:plugins:read");

/**
 * POST /api/agent-plugins/[id]/reviews
 * Submit a tenant-scoped review for a plugin with atomic rating rollup.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to submit a review" },
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = agentPluginReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const review = await marketplaceEngine.addReview(
      pluginId,
      {
        userId: session.staffId,
        institutionId,
        role: session.role,
      },
      parsed.data.rating,
      parsed.data.reviewText
    );

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}, "marketplace:reviews:write");
