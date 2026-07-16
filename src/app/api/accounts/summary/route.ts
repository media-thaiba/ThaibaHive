import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialTransactions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const from = url.searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const to = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

  const summary = await db.all(sql`
    SELECT
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM financial_transactions
    WHERE transaction_date >= ${from}
      AND transaction_date <= ${to}
      ${institutionId ? sql`AND institution_id = ${institutionId}` : sql``}
    GROUP BY type
  `);

  const rows = summary as { type: string; count: number; total: number }[];
  const totalIncome = rows.find((r) => r.type === "income")?.total || 0;
  const totalExpense = rows.find((r) => r.type === "expense")?.total || 0;

  return NextResponse.json({
    summary,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    from,
    to,
  });
}, "accounts:view");
