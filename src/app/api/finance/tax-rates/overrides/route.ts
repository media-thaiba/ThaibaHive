import { NextResponse } from "next/server";
import { db, taxRateOverrides, eq, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { taxRateOverrideCreateSchema } from "@/lib/validation/schemas";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";
import { resolveInstitutionId, resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveInstitutionId(searchParams.get("institutionId"));

    const overrides = await db
      .select()
      .from(taxRateOverrides)
      .where(eq(taxRateOverrides.institutionId, institutionId))
      .orderBy(desc(taxRateOverrides.createdAt));

    return NextResponse.json({ overrides });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch tax overrides" }, { status: 500 });
  }
}, "finance:tax:view");

export const POST = requireAuth(async (request: Request, session: any) => {
  try {
    const body = await request.json();
    const parsed = taxRateOverrideCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    const created = await taxRateEngine.createOverride({
      ...parsed.data,
      institutionId,
      approvedById: session.staffId,
    });

    return NextResponse.json({ override: created }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes("scope mismatch") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to create tax override" }, { status });
  }
}, "finance:tax:override");
