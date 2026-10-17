import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";
import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(
  async (_request: Request, _session: any, context?: any) => {
    try {
      const params = context?.params ? await context.params : {};
      const id = params.id;

      if (!id) {
        return NextResponse.json({ error: "Reconciliation ID is required" }, { status: 400 });
      }

      // Scope first: a cross-tenant session must look nonexistent, not forbidden.
      const scope = await getUserInstitutionScope();
      const result = await reconciliationEngine.getReconciliation(id, scope ?? undefined);
      if (!result) {
        return NextResponse.json({ error: "Reconciliation session not found" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error: unknown) {
      console.error("[Reconciliation Session Fetch Error]:", error instanceof Error ? error.stack : error);
      return NextResponse.json(
        { error: "Failed to fetch reconciliation session" },
        { status: 500 }
      );
    }
  },
  "finance:reconciliation:view"
);
