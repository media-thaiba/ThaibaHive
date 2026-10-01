import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { payrollGeneratePeriodSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const POST = requireAuth(async (request: Request) => {
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
  } catch (error: any) {
    const status = error.message?.includes("scope mismatch") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to generate payroll" }, { status });
  }
}, "finance:payroll:manage");
