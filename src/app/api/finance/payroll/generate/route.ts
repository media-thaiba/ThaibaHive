import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { payrollGeneratePeriodSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = payrollGeneratePeriodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const records = await payrollEngine.generateMonthlyPayroll(
      institutionId,
      parsed.data.payPeriodYear,
      parsed.data.payPeriodMonth,
      parsed.data.staffIds
    );

    return NextResponse.json({ records, count: records.length }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Generate Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to generate payroll" }, { status });
  }
}, "finance:payroll:manage");
