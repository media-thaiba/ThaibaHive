import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(financialTransactions).where(eq(financialTransactions.id, id)).run();
  return NextResponse.json({ success: true });
}, "accounts:manage");
