import { NextResponse } from "next/server";
import { db, payrollRecords, eq, and, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { payrollRecordStatusUpdateSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request, session: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const staffId = searchParams.get("staffId") || (session.role === "staff" ? session.staffId : undefined);

    const conditions: any[] = [eq(payrollRecords.institutionId, institutionId)];
    if (year) conditions.push(eq(payrollRecords.payPeriodYear, parseInt(year, 10)));
    if (month) conditions.push(eq(payrollRecords.payPeriodMonth, parseInt(month, 10)));
    if (staffId) conditions.push(eq(payrollRecords.staffId, staffId));

    const records = await db
      .select()
      .from(payrollRecords)
      .where(and(...conditions))
      .orderBy(desc(payrollRecords.createdAt));

    return NextResponse.json({ records });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Records Fetch Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch payroll records" }, { status });
  }
}, "finance:payroll:view");

export const PATCH = requireAuth(async (request: Request, session: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("id");

    if (!recordId) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = payrollRecordStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const updated = await payrollEngine.updateRecordStatus(
      recordId,
      parsed.data.status,
      session.staffId,
      parsed.data.paymentReference
    );

    return NextResponse.json({ record: updated });
  } catch (error: unknown) {
    console.error("[Payroll Records Update Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to update payroll status" }, { status: 500 });
  }
}, "finance:payroll:manage");
