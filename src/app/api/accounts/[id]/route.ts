import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(financialTransactions.id, id), eq(financialTransactions.institutionId, scopedInstitutionId))
    : eq(financialTransactions.id, id);

  const existing = await db.select().from(financialTransactions).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  await db.delete(financialTransactions).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "accounts:manage");
