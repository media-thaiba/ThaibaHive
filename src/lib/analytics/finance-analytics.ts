import { db } from "@/db";
import { financialTransactions } from "@thaiba/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export interface FinancialAnalytics {
  collectionTotal: number;
  expenseTotal: number;
  collectionEfficiency: number;
  dailyCollections: Array<{ date: string; amount: number }>;
}

export async function getFinancialAnalytics(
  institutionId: string,
  startDate: string,
  endDate: string
): Promise<FinancialAnalytics> {
  try {
    const transactions = await db
      .select({
        type: financialTransactions.type,
        amount: financialTransactions.amount,
        date: financialTransactions.transactionDate
      })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.institutionId, institutionId),
          gte(financialTransactions.transactionDate, startDate),
          lte(financialTransactions.transactionDate, endDate)
        )
      )
      .all();

    let collectionTotal = 0;
    let expenseTotal = 0;
    const dailyMap = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type === "credit") {
        collectionTotal += tx.amount;
        dailyMap.set(tx.date, (dailyMap.get(tx.date) ?? 0) + tx.amount);
      } else if (tx.type === "debit") {
        expenseTotal += tx.amount;
      }
    }

    const collectionEfficiency =
      collectionTotal + expenseTotal > 0
        ? Math.round((collectionTotal / (collectionTotal + expenseTotal)) * 100)
        : 100;

    const dailyCollections = Array.from(dailyMap.entries()).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      collectionTotal,
      expenseTotal,
      collectionEfficiency,
      dailyCollections
    };
  } catch (error) {
    console.error("[getFinancialAnalytics] Error:", error);
    return {
      collectionTotal: 0,
      expenseTotal: 0,
      collectionEfficiency: 100,
      dailyCollections: []
    };
  }
}
