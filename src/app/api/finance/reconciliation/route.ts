import { NextResponse } from "next/server";
import { db, financialReconciliations, eq, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { financialReconciliationCreateSchema } from "@/lib/validation/schemas";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));

    const sessions = await db
      .select()
      .from(financialReconciliations)
      .where(eq(financialReconciliations.institutionId, institutionId))
      .orderBy(desc(financialReconciliations.createdAt));

    return NextResponse.json({ reconciliations: sessions });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Reconciliation Fetch Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch reconciliations" }, { status });
  }
}, "finance:reconciliation:view");

export const POST = requireAuth(async (request: Request, session: any) => {
  try {
    const body = await request.json();
    const parsed = financialReconciliationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const result = await reconciliationEngine.createReconciliationSession({
      institutionId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      bankStatementEntries: parsed.data.bankStatementEntries,
      notes: parsed.data.notes,
      reconciledById: session.staffId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Reconciliation Execute Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to execute reconciliation" }, { status });
  }
}, "finance:reconciliation:execute");
