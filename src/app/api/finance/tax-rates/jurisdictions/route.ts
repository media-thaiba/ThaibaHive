import { NextResponse } from "next/server";
import { db, taxJurisdictions, desc, eq } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { taxJurisdictionCreateSchema } from "@/lib/validation/schemas";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";

export const GET = requireAuth(async (_request: Request, session: import("@thaiba/auth").SessionPayload) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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

export const POST = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taxJurisdictionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const upperTaxCode = parsed.data.taxCode.toUpperCase();

    // Collision check for duplicate jurisdiction taxCode
    const [existing] = await db
      .select()
      .from(taxJurisdictions)
      .where(eq(taxJurisdictions.taxCode, upperTaxCode));

    if (existing) {
      return NextResponse.json(
        { error: `Tax jurisdiction with code '${upperTaxCode}' already exists` },
        { status: 409 }
      );
    }

    const created = await taxRateEngine.createJurisdiction(parsed.data);
    return NextResponse.json({ jurisdiction: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Tax Jurisdiction Create Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to create tax jurisdiction" }, { status: 500 });
  }
}, "finance:tax:manage");
