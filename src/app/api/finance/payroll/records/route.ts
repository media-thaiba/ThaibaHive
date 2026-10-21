import { NextResponse } from "next/server";
import { db, payrollRecords, eq, and, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { payrollRecordStatusUpdateSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    // Parameter range validation
    let payPeriodYear: number | undefined;
    if (yearParam !== null) {
      payPeriodYear = Number(yearParam);
      if (!Number.isInteger(payPeriodYear) || payPeriodYear < 2020 || payPeriodYear > 2100) {
        return NextResponse.json({ error: "Invalid year parameter (must be 2020-2100)" }, { status: 400 });
      }
    }

    let payPeriodMonth: number | undefined;
    if (monthParam !== null) {
      payPeriodMonth = Number(monthParam);
      if (!Number.isInteger(payPeriodMonth) || payPeriodMonth < 1 || payPeriodMonth > 12) {
        return NextResponse.json({ error: "Invalid month parameter (must be 1-12)" }, { status: 400 });
      }
    }

    // Role-based staff scoping: staff role can only view their own records
    const staffId = session.role === "staff" ? session.staffId : (searchParams.get("staffId") || undefined);

    const conditions: any[] = [];
    if (institutionId && institutionId !== "global") {
      conditions.push(eq(payrollRecords.institutionId, institutionId));
    }
    if (payPeriodYear !== undefined) conditions.push(eq(payrollRecords.payPeriodYear, payPeriodYear));
    if (payPeriodMonth !== undefined) conditions.push(eq(payrollRecords.payPeriodMonth, payPeriodMonth));
    if (staffId) conditions.push(eq(payrollRecords.staffId, staffId));

    const records = await db
      .select()
      .from(payrollRecords)
      .where(conditions.length ? and(...conditions) : undefined)
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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get("id");

  if (!recordId) {
    return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = payrollRecordStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));
    const conditions: any[] = [eq(payrollRecords.id, recordId)];
    if (institutionId && institutionId !== "global") {
      conditions.push(eq(payrollRecords.institutionId, institutionId));
    }

    const [existing] = await db
      .select()
      .from(payrollRecords)
      .where(and(...conditions));

    if (!existing) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    // Guard against modifying terminal status records
    if (existing.status === "disbursed" || existing.status === "voided") {
      return NextResponse.json(
        { error: `Cannot update a payroll record that is already ${existing.status}` },
        { status: 409 }
      );
    }

    // Status transition validation state machine
    const allowedTransitions: Record<string, string[]> = {
      draft: ["approved", "voided"],
      approved: ["disbursed", "voided", "draft"],
    };

    if (!allowedTransitions[existing.status]?.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from '${existing.status}' to '${parsed.data.status}'` },
        { status: 400 }
      );
    }

    const updated = await payrollEngine.updateRecordStatus(
      recordId,
      parsed.data.status,
      session.staffId,
      parsed.data.paymentReference
    );

    return NextResponse.json({ record: updated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Records Update Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to update payroll status" }, { status });
  }
}, "finance:payroll:manage");
