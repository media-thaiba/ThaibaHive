import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveRequestInstitution } from "@thaiba/auth";
import { taxCalculationSchema } from "@/lib/validation/schemas";
import { taxRateEngine } from "@/lib/finance/tax/tax-rate-engine";
import { resolveInstitutionId } from "@/lib/finance/institution-context";

export const POST = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taxCalculationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const instId = await resolveInstitutionId(institutionId);

    const result = await taxRateEngine.calculateTax(
      parsed.data.amount,
      instId,
      parsed.data.category,
      parsed.data.jurisdictionId,
      parsed.data.asOfDate
    );

    return NextResponse.json({ calculation: result });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Tax Calculation Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to calculate tax" }, { status });
  }
}, "finance:tax:view");
