import { NextResponse } from "next/server";
import { db } from "@/db";
import { canteenMealPasses } from "@/db/schema";
import { requireAuth, resolveInstitutionContext, resolveScopedInstitutions } from "@/lib/api/auth-guard";
import { canteenPassCreateSchema } from "@/lib/validation/schemas";
import { isUniqueConstraintViolation } from "@/lib/api/sqlite-errors";
import { and, eq, inArray, desc } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const isManager =
    session.role === "admin" || session.role === "super_admin" || session.role === "principal";
  const requestedUserId = url.searchParams.get("userId");

  if (requestedUserId && requestedUserId !== session.staffId && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = requestedUserId && isManager ? requestedUserId : session.staffId;
  const allowedInstitutions = await resolveScopedInstitutions(session);

  const conditions = [eq(canteenMealPasses.userId, userId)];
  if (!allowedInstitutions.includes("global")) {
    conditions.push(inArray(canteenMealPasses.institutionId, allowedInstitutions));
  }

  const passes = await db
    .select()
    .from(canteenMealPasses)
    .where(and(...conditions))
    .orderBy(desc(canteenMealPasses.createdAt))
    .all();

  return NextResponse.json({ passes });
}, "canteen:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = canteenPassCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal pass parameters", details: parsed.error.format() }, { status: 400 });
  }

  const raw = (body || {}) as Record<string, unknown>;
  const { userId, passCode, balance, dailyLimit } = parsed.data;
  const institutionId = await resolveInstitutionContext(session, raw.institutionId as string | undefined);
  if (!institutionId) {
    return NextResponse.json(
      { error: "A concrete institution context is required to create a meal pass" },
      { status: 400 }
    );
  }
  const isManager = session.role === "admin" || session.role === "super_admin" || session.role === "principal";

  const existing = await db
    .select({ id: canteenMealPasses.id })
    .from(canteenMealPasses)
    .where(eq(canteenMealPasses.passCode, passCode))
    .get();
  if (existing) {
    return NextResponse.json({ error: "Meal pass code already exists" }, { status: 409 });
  }

  try {
    const pass = await db
      .insert(canteenMealPasses)
      .values({
        id: crypto.randomUUID(),
        institutionId,
        userId: isManager && userId ? userId : session.staffId,
        passCode,
        balance,
        currency: "INR",
        status: "active",
        dailyLimit: dailyLimit || null,
      })
      .returning()
      .get();

    return NextResponse.json({ pass }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintViolation(error, "pass_code")) {
      return NextResponse.json({ error: "Meal pass code already exists" }, { status: 409 });
    }
    throw error;
  }
}, "canteen:manage");
