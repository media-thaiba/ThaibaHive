import { NextResponse } from "next/server";
import { db, taxRateOverrides, taxJurisdictions, eq, and, desc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveRequestInstitution } from "@thaiba/auth";
import { taxRateOverrideCreateSchema } from "@/lib/validation/schemas";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";

export const GET = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));

    const overrides = await db
      .select()
      .from(taxRateOverrides)
      .where(eq(taxRateOverrides.institutionId, institutionId))
      .orderBy(desc(taxRateOverrides.createdAt));

    return NextResponse.json({ overrides });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Tax Overrides Fetch Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to fetch tax overrides" }, { status });
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

  const parsed = taxRateOverrideCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);

    // 1. Verify jurisdiction existence (referential integrity)
    const [jurisdiction] = await db
      .select()
      .from(taxJurisdictions)
      .where(eq(taxJurisdictions.id, parsed.data.jurisdictionId));

    if (!jurisdiction) {
      return NextResponse.json({ error: "Tax jurisdiction not found" }, { status: 404 });
    }

    // 2. Collision guard: check if an active override already exists for this institution and category
    const [existing] = await db
      .select()
      .from(taxRateOverrides)
      .where(
        and(
          eq(taxRateOverrides.institutionId, institutionId),
          eq(taxRateOverrides.category, parsed.data.category),
          eq(taxRateOverrides.isActive, true)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: `An active tax override already exists for category '${parsed.data.category}' in this institution` },
        { status: 409 }
      );
    }

    const created = await taxRateEngine.createOverride({
      ...parsed.data,
      institutionId,
      approvedById: session.staffId,
    });

    return NextResponse.json({ override: created }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Tax Override Create Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to create tax override" }, { status });
  }
}, "finance:tax:override");
