import { NextResponse } from "next/server";
import { db, taxJurisdictions, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { taxJurisdictionCreateSchema } from "@/lib/validation/schemas";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";

export const GET = requireAuth(async () => {
  try {
    const list = await db
      .select()
      .from(taxJurisdictions)
      .orderBy(desc(taxJurisdictions.createdAt));
    return NextResponse.json({ jurisdictions: list });
  } catch (error: unknown) {
    console.error("[Tax Jurisdictions Fetch Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to fetch tax jurisdictions" }, { status: 500 });
  }
}, "finance:tax:view");

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = taxJurisdictionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const created = await taxRateEngine.createJurisdiction(parsed.data);
    return NextResponse.json({ jurisdiction: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Tax Jurisdiction Create Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to create tax jurisdiction" }, { status: 500 });
  }
}, "finance:tax:manage");
