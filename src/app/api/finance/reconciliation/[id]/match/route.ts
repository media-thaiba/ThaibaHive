import { NextResponse } from "next/server";
import { db, financialReconciliationItems, financialReconciliations, eq, and, sql } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { financialReconciliationItemMatchSchema } from "@/lib/validation/schemas";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

const TERMINAL_MATCH_STATUSES = ["matched", "manual_override"] as const;
const INVALID_REGRESSIONS: Record<string, string[]> = {
  matched: ["unmatched"], // Once matched, cannot go back to unmatched
  manual_override: ["unmatched", "variance"], // Manual override cannot regress
  variance: ["matched"], // Variance cannot become matched
};

export const PATCH = requireAuth(async (request: Request, session: any, context?: any) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  // Dynamic route parameter fallback: params.id, URL pathname, query param
  let itemId: string | undefined;
  try {
    const resolvedParams = context?.params ? ("then" in context.params ? await context.params : context.params) : undefined;
    itemId = resolvedParams?.id;
  } catch {
    itemId = undefined;
  }
  if (!itemId) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // pathname is .../reconciliation/[id]/match, so itemId is at index -2
    itemId = pathParts[pathParts.length - 2] || (url.searchParams.get("itemId") ?? undefined);
  }

  if (!itemId) {
    return NextResponse.json({ error: "Missing reconciliation item ID" }, { status: 400 });
  }

  // Safe JSON parsing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = financialReconciliationItemMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    const institutionId = await resolveScopedInstitutionId(null);

    const [result] = await db
      .select({
        item: financialReconciliationItems,
        institutionId: financialReconciliations.institutionId,
      })
      .from(financialReconciliationItems)
      .innerJoin(
        financialReconciliations,
        eq(financialReconciliationItems.reconciliationId, financialReconciliations.id)
      )
      .where(
        and(
          eq(financialReconciliationItems.id, itemId),
          institutionId === "global"
            ? sql`1=1`
            : eq(financialReconciliations.institutionId, institutionId)
        )
      );

    if (!result) {
      return NextResponse.json({ error: "Reconciliation item not found" }, { status: 404 });
    }

    const itemRow = result.item;

    // State invariant: Once an item is in a terminal match status, reject invalid regressions
    const currentStatus = itemRow.matchStatus;
    const newStatus = parsed.data.matchStatus;

    if (TERMINAL_MATCH_STATUSES.includes(currentStatus as any) && INVALID_REGRESSIONS[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot change match status from '${currentStatus}' to '${newStatus}' - invalid state transition` },
        { status: 409 }
      );
    }

    // If new status is terminal, ensure we don't allow regression later
    const now = new Date().toISOString();
    const [updated] = await db
      .update(financialReconciliationItems)
      .set({
        matchStatus: newStatus,
        matchedWithId: parsed.data.matchedWithId,
        varianceAmount: parsed.data.varianceAmount ?? 0,
        resolutionNotes: parsed.data.resolutionNotes,
      })
      .where(
        and(
          eq(financialReconciliationItems.id, itemId),
          eq(financialReconciliationItems.reconciliationId, itemRow.reconciliationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Failed to update reconciliation item" }, { status: 500 });
    }

    // Keep the session's matched/unmatched counters truthful after an override
    const allItems = await db
      .select()
      .from(financialReconciliationItems)
      .where(eq(financialReconciliationItems.reconciliationId, itemRow.reconciliationId));

    const matchedCount = allItems.filter(
      (i) => i.matchStatus === "matched" || i.matchStatus === "manual_override"
    ).length;

    await db
      .update(financialReconciliations)
      .set({
        matchedItemCount: matchedCount,
        unmatchedItemCount: allItems.length - matchedCount,
        updatedAt: now,
      })
      .where(eq(financialReconciliations.id, itemRow.reconciliationId));

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Reconciliation Item Match Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to update reconciliation item" }, { status });
  }
}, "finance:reconciliation:execute");