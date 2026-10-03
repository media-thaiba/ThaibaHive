import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveBalances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(leaveBalances)
    .set(pick(body, ["totalDays", "usedDays"]))
    .where(eq(leaveBalances.id, id))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ balance: updated });
}, "leave:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(leaveBalances).where(eq(leaveBalances.id, id)).run();
  return NextResponse.json({ success: true });
}, "leave:manage");
