import { NextResponse } from "next/server";
import { db, payrollSalaryStructures, eq, and } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { payrollSalaryStructureCreateSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const requestedStaffId = searchParams.get("staffId");
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));

    // Non-admin staff can only query their own salary structure
    const staffId = session.role === "staff" ? session.staffId : requestedStaffId;

    if (staffId) {
      const conditions: any[] = [eq(payrollSalaryStructures.staffId, staffId)];
      if (institutionId && institutionId !== "global") {
        conditions.push(eq(payrollSalaryStructures.institutionId, institutionId));
      }
      const structures = await db
        .select()
        .from(payrollSalaryStructures)
        .where(and(...conditions));
      return NextResponse.json({ structures });
    }

    const conditions: any[] = [];
    if (institutionId && institutionId !== "global") {
      conditions.push(eq(payrollSalaryStructures.institutionId, institutionId));
    }
    const structures = await db
      .select()
      .from(payrollSalaryStructures)
      .where(conditions.length ? and(...conditions) : undefined);

    return NextResponse.json({ structures });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Structures Fetch Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch salary structures" }, { status });
  }
}, "finance:payroll:view");

export const POST = requireAuth(async (request: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = payrollSalaryStructureCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const structure = await payrollEngine.createOrUpdateSalaryStructure({ ...parsed.data, institutionId });
    return NextResponse.json({ structure }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Structures Configure Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to configure salary structure" }, { status });
  }
}, "finance:payroll:manage");
