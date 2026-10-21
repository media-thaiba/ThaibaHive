import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { payrollGeneratePeriodSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";
import { withPayrollBatchLock } from "@/lib/finance/payroll/payroll-lock";

export const POST = requireAuth(async (request: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = payrollGeneratePeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const lockKey = `${institutionId}:${parsed.data.payPeriodYear}:${parsed.data.payPeriodMonth}`;

    const { records, skipped } = await withPayrollBatchLock(lockKey, () =>
      payrollEngine.generateMonthlyPayroll(
        institutionId,
        parsed.data.payPeriodYear,
        parsed.data.payPeriodMonth,
        parsed.data.staffIds
      )
    );

    return NextResponse.json({ records, count: records.length, skipped }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("already in progress")) {
      return NextResponse.json({ error: "Payroll generation already in progress for this period" }, { status: 409 });
    }
    console.error("[Payroll Generate Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to generate payroll" }, { status });
  }
}, "finance:payroll:manage");
