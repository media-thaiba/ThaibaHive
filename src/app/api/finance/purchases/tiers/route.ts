import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseApprovalTiers } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveInstitutionScopeForSession } from "@/lib/auth/institution-scope";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";
import { purchaseApprovalTierCreateSchema } from "@/lib/validation/schemas";
import { eq, asc, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const requestedInst = searchParams.get("institutionId");

    let institutionId: string;
    try {
      institutionId = await resolveScopedInstitutionId(requestedInst);
    } catch {
      institutionId =
        (session.institutionId && session.institutionId !== "global"
          ? session.institutionId
          : await resolveInstitutionScopeForSession(session)) || "inst_default";
    }

    if (!institutionId) {
      return NextResponse.json({ error: "Unable to resolve institutional context" }, { status: 400 });
    }

    const tiers = await db
      .select()
      .from(purchaseApprovalTiers)
      .where(eq(purchaseApprovalTiers.institutionId, institutionId))
      .orderBy(asc(purchaseApprovalTiers.tierLevel));

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("[Purchase Tiers Fetch Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to fetch purchase tiers" }, { status: 500 });
  }
}, "finance:read");

export const POST = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = purchaseApprovalTierCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  try {
    let resolvedInstitutionId: string;
    try {
      resolvedInstitutionId = await resolveScopedInstitutionId(parsed.data.institutionId);
    } catch {
      resolvedInstitutionId =
        parsed.data.institutionId ||
        session.institutionId ||
        (await resolveInstitutionScopeForSession(session)) ||
        "inst_default";
    }

    if (!resolvedInstitutionId) {
      return NextResponse.json({ error: "Unable to resolve institutional context" }, { status: 400 });
    }

    // Check for duplicate tier level in the same institution
    const [existing] = await db
      .select()
      .from(purchaseApprovalTiers)
      .where(
        and(
          eq(purchaseApprovalTiers.institutionId, resolvedInstitutionId),
          eq(purchaseApprovalTiers.tierLevel, parsed.data.tierLevel)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: `Approval tier level ${parsed.data.tierLevel} already exists for this institution` },
        { status: 409 }
      );
    }

    const [tier] = await db
      .insert(purchaseApprovalTiers)
      .values({
        id: crypto.randomUUID(),
        institutionId: resolvedInstitutionId,
        tierLevel: parsed.data.tierLevel,
        name: parsed.data.name,
        minAmount: parsed.data.minAmount ?? 0,
        maxAmount: parsed.data.maxAmount ?? null,
        requiredRole: parsed.data.requiredRole,
        requiresSequentialApproval: parsed.data.requiresSequentialApproval ?? true,
        autoEscalateHours: parsed.data.autoEscalateHours ?? 48,
      })
      .returning();

    return NextResponse.json({ tier }, { status: 201 });
  } catch (error) {
    console.error("[Purchase Tiers Create Error]:", error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: "Failed to create purchase tier" }, { status: 500 });
  }
}, "finance:approve");
