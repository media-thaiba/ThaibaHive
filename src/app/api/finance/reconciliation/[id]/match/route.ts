import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { financialReconciliationItemMatchSchema } from "@/lib/validation/schemas";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";

export const PATCH = requireAuth(
  async (request: Request, _session: any, context?: any) => {
    try {
      const params = context?.params ? await context.params : {};
      const id = params.id;

      if (!id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }

      const body = await request.json();
      const parsed = financialReconciliationItemMatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid payload" },
          { status: 400 }
        );
      }

      const updated = await reconciliationEngine.manualMatchItem({
        itemId: id,
        matchStatus: parsed.data.matchStatus,
        matchedWithId: parsed.data.matchedWithId,
        varianceAmount: parsed.data.varianceAmount,
        resolutionNotes: parsed.data.resolutionNotes,
      });

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
