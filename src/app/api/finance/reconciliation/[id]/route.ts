import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request, session: any, context: { params: Promise<{ id: string }> } | { params: { id: string } }) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  // Dynamic route parameter fallback: params.id, URL pathname, query param
  let reconciliationId: string | undefined;
  try {
    const resolvedParams = "then" in context.params ? await context.params : context.params;
    reconciliationId = resolvedParams?.id;
  } catch {
    reconciliationId = undefined;
  }
  if (!reconciliationId) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    reconciliationId = pathParts[pathParts.length - 1] || url.searchParams.get("id") ?? undefined;
  }

  if (!reconciliationId) {
    return NextResponse.json({ error: "Missing reconciliation ID" }, { status: 400 });
  }

  try {
    const institutionId = await resolveScopedInstitutionId(null);
    const result = await reconciliationEngine.getReconciliation(reconciliationId, institutionId);

    if (!result) {
      return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Reconciliation Fetch By ID Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch reconciliation" }, { status });
  }
}, "finance:reconciliation:view");