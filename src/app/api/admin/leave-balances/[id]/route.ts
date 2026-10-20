import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveBalances, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq, and } from "drizzle-orm";
import { leaveBalanceUpdateSchema } from "@/lib/validation/schemas";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const parsed = leaveBalanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await db
    .select({ id: leaveBalances.id, staffId: leaveBalances.staffId })
    .from(leaveBalances)
    .where(eq(leaveBalances.id, id))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope) {
    const membership = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, existing.staffId),
          eq(staffInstitutions.institutionId, instScope)
        )
      )
      .get();
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db
    .update(leaveBalances)
    .set(pick(parsed.data, ["totalDays", "usedDays"]))
    .where(eq(leaveBalances.id, id))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ balance: updated });
}, "leave:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const existing = await db
    .select({ id: leaveBalances.id, staffId: leaveBalances.staffId })
    .from(leaveBalances)
    .where(eq(leaveBalances.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope) {
    const membership = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, existing.staffId),
          eq(staffInstitutions.institutionId, instScope)
        )
      )
      .get();
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(leaveBalances).where(eq(leaveBalances.id, id)).run();
  return NextResponse.json({ success: true });
}, "leave:manage");
