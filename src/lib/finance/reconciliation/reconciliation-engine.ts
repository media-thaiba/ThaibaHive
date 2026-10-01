import {
  db,
  financialTransactions,
  financialReconciliations,
  financialReconciliationItems,
  eq,
  and,
  gte,
  lte,
} from "@/db";
import { createHash, randomUUID } from "crypto";

export interface BankStatementInput {
  referenceId: string;
  transactionDate: string;
  amount: number;
  description?: string;
}

export class ReconciliationEngine {
  private static instance: ReconciliationEngine;

  private constructor() {}

  public static getInstance(): ReconciliationEngine {
    if (!ReconciliationEngine.instance) {
      ReconciliationEngine.instance = new ReconciliationEngine();
    }
    return ReconciliationEngine.instance;
  }

  /**
   * Run 3-Way Reconciliation between Fee Ledger, Expense Ledger, and Bank Statements
   */
  async createReconciliationSession(input: {
    institutionId: string;
    periodStart: string;
    periodEnd: string;
    bankStatementEntries?: BankStatementInput[];
    notes?: string;
    reconciledById?: string;
  }) {
    const reconciliationId = `recon-${randomUUID()}`;
    const now = new Date().toISOString();

    // 1. Fetch fee / income transactions in period
    const incomeTx = await db
      .select()
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.institutionId, input.institutionId),
          gte(financialTransactions.transactionDate, input.periodStart),
          lte(financialTransactions.transactionDate, input.periodEnd),
          eq(financialTransactions.type, "income")
        )
      );

    const totalFeeLedgerAmount = Number(
      incomeTx.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)
    );

    // 2. Fetch expense claims in period
    const expTx = await db
      .select()
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.institutionId, input.institutionId),
          gte(financialTransactions.transactionDate, input.periodStart),
          lte(financialTransactions.transactionDate, input.periodEnd),
          eq(financialTransactions.type, "expense")
        )
      );

    const totalExpenseLedgerAmount = Number(
      expTx.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)
    );

    // 3. Compute Bank Statement Totals
    const bankEntries = input.bankStatementEntries || [];
    const totalBankStatementAmount = Number(
      bankEntries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)
    );

    // 4. Net Variance
    const netLedgerBalance = totalFeeLedgerAmount - totalExpenseLedgerAmount;
    const unreconciledVariance = Number((netLedgerBalance - totalBankStatementAmount).toFixed(2));

    const auditData = `${input.institutionId}:${input.periodStart}:${input.periodEnd}:${unreconciledVariance}:${now}`;
    const auditHash = createHash("sha256").update(auditData).digest("hex");

    const status = Math.abs(unreconciledVariance) < 0.01 ? "reconciled" : "flagged_variance";

    // 5. Create Parent Reconciliation Record
    await db
      .insert(financialReconciliations)
      .values({
        id: reconciliationId,
        institutionId: input.institutionId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalFeeLedgerAmount,
        totalExpenseLedgerAmount,
        totalBankStatementAmount,
        unreconciledVariance,
        status,
        reconciledById: input.reconciledById,
        auditHash,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 6. Ingest and Match Items
    const itemsToInsert = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    // Track available bank amounts for simple 1-1 auto-matching
    const matchedBankIndexes = new Set<number>();

    // Process Fee Ledger Items
    for (const tx of incomeTx) {
      const matchIdx = bankEntries.findIndex(
        (b, idx) => !matchedBankIndexes.has(idx) && Math.abs(b.amount - tx.amount) < 0.01
      );

      const isMatched = matchIdx !== -1;
      if (isMatched) {
        matchedBankIndexes.add(matchIdx);
        matchedCount++;
      } else {
        unmatchedCount++;
      }

      itemsToInsert.push({
        id: `recon-item-${randomUUID()}`,
        reconciliationId,
        sourceType: "fee_transaction",
        sourceReferenceId: tx.id,
        transactionDate: tx.transactionDate,
        amount: tx.amount,
        matchStatus: isMatched ? "matched" : "unmatched",
        matchedWithId: isMatched ? bankEntries[matchIdx].referenceId : undefined,
        varianceAmount: 0,
        createdAt: now,
      });
    }

    // Process Expense Ledger Items
    for (const tx of expTx) {
      const matchIdx = bankEntries.findIndex(
        (b, idx) => !matchedBankIndexes.has(idx) && Math.abs(b.amount - -tx.amount) < 0.01
      );

      const isMatched = matchIdx !== -1;
      if (isMatched) {
        matchedBankIndexes.add(matchIdx);
        matchedCount++;
      } else {
        unmatchedCount++;
      }

      itemsToInsert.push({
        id: `recon-item-${randomUUID()}`,
        reconciliationId,
        sourceType: "expense_claim",
        sourceReferenceId: tx.id,
        transactionDate: tx.transactionDate,
        amount: -tx.amount,
        matchStatus: isMatched ? "matched" : "unmatched",
        matchedWithId: isMatched ? bankEntries[matchIdx].referenceId : undefined,
        varianceAmount: 0,
        createdAt: now,
      });
    }

    // Process Remaining Unmatched Bank Entries
    for (let i = 0; i < bankEntries.length; i++) {
      if (!matchedBankIndexes.has(i)) {
        unmatchedCount++;
        itemsToInsert.push({
          id: `recon-item-${randomUUID()}`,
          reconciliationId,
          sourceType: "bank_statement",
          sourceReferenceId: bankEntries[i].referenceId,
          transactionDate: bankEntries[i].transactionDate,
          amount: bankEntries[i].amount,
          matchStatus: "unmatched",
          varianceAmount: bankEntries[i].amount,
          resolutionNotes: bankEntries[i].description,
          createdAt: now,
        });
      }
    }

    if (itemsToInsert.length > 0) {
      await db.insert(financialReconciliationItems).values(itemsToInsert);
    }

    // Update session counts
    const [finalSession] = await db
      .update(financialReconciliations)
      .set({
        matchedItemCount: matchedCount,
        unmatchedItemCount: unmatchedCount,
        updatedAt: now,
      })
      .where(eq(financialReconciliations.id, reconciliationId))
      .returning();

    return {
      session: finalSession,
      items: itemsToInsert,
    };
  }

  /**
   * Manual override / match an item
   */
  async manualMatchItem(input: {
    itemId: string;
    matchStatus: "matched" | "manual_override" | "variance" | "unmatched";
    matchedWithId?: string;
    varianceAmount?: number;
    resolutionNotes?: string;
  }) {
    const [updated] = await db
      .update(financialReconciliationItems)
      .set({
        matchStatus: input.matchStatus,
        matchedWithId: input.matchedWithId,
        varianceAmount: input.varianceAmount ?? 0,
        resolutionNotes: input.resolutionNotes,
      })
      .where(eq(financialReconciliationItems.id, input.itemId))
      .returning();

    return updated;
  }

  /**
   * Retrieve reconciliation report
   */
  async getReconciliation(reconciliationId: string) {
    const [session] = await db
      .select()
      .from(financialReconciliations)
      .where(eq(financialReconciliations.id, reconciliationId));

    if (!session) return null;

    const items = await db
      .select()
      .from(financialReconciliationItems)
      .where(eq(financialReconciliationItems.reconciliationId, reconciliationId));

    return {
      session,
      items,
    };
  }
}

export const reconciliationEngine = ReconciliationEngine.getInstance();
