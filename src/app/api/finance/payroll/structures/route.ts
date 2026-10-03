import { NextResponse } from "next/server";
import { db, payrollSalaryStructures, eq } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { payrollSalaryStructureCreateSchema } from "@/lib/validation/schemas";
import { payrollEngine } from "@/lib/finance/payroll/payroll-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const institutionId = await resolveScopedInstitutionId(searchParams.get("institutionId"));

    if (staffId) {
      const structures = await db
        .select()
        .from(payrollSalaryStructures)
        .where(eq(payrollSalaryStructures.staffId, staffId));
      return NextResponse.json({ structures });
    }

    const structures = await db
      .select()
      .from(payrollSalaryStructures)
      .where(eq(payrollSalaryStructures.institutionId, institutionId));

    return NextResponse.json({ structures });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Payroll Structures Fetch Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch salary structures" }, { status });
  }
}, "finance:payroll:view");

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = payrollSalaryStructureCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

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
