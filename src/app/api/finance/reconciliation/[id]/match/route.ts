import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { financialReconciliationItemMatchSchema } from "@/lib/validation/schemas";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";
import { getUserInstitutionScope } from "@/lib/auth";

export const PATCH = requireAuth(
  async (request: Request, _session: any, context?: any) => {
    try {
      const params = context?.params ? await context.params : {};
      const id = params.id;

      if (!id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = financialReconciliationItemMatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid payload" },
          { status: 400 }
        );
      }

      // Tenant guard: items outside the caller's institution scope are
      // invisible (404), never mutable.
      const scope = await getUserInstitutionScope();
      const updated = await reconciliationEngine.manualMatchItem({
        itemId: id,
        matchStatus: parsed.data.matchStatus,
        matchedWithId: parsed.data.matchedWithId,
        varianceAmount: parsed.data.varianceAmount,
        resolutionNotes: parsed.data.resolutionNotes,
        institutionId: scope ?? undefined,
      });

      if (!updated) {
        return NextResponse.json({ error: "Reconciliation item not found" }, { status: 404 });
      }

      return NextResponse.json({ item: updated });
    } catch (error: unknown) {
      console.error("[Reconciliation Match Error]:", error instanceof Error ? error.stack : error);
      return NextResponse.json(
        { error: "Failed to update reconciliation item match" },
        { status: 500 }
      );
    }
  },
  "finance:reconciliation:execute"
);
