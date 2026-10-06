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

      const result = await reconciliationEngine.getReconciliation(id);
      if (!result) {
        return NextResponse.json({ error: "Reconciliation session not found" }, { status: 404 });
      }

      const scope = await getUserInstitutionScope();
      if (scope && result.session.institutionId !== scope) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
