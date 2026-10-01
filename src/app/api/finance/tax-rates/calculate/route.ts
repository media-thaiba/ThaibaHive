import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";
import { resolveInstitutionId } from "@/lib/finance/institution-context";

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const { amount, category, institutionId, jurisdictionId, asOfDate } = body;

    if (typeof amount !== "number" || !category) {
      return NextResponse.json({ error: "amount and category are required" }, { status: 400 });
    }

    const instId = await resolveInstitutionId(institutionId);
    const result = await taxRateEngine.calculateTax(
      amount,
      instId,
      category,
      jurisdictionId,
      asOfDate
    );

    return NextResponse.json({ calculation: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate tax" }, { status: 500 });
  }
}, "finance:tax:view");
