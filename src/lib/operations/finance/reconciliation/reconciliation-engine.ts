import crypto from 'crypto';
import { FeeDbStore } from '../../../../db/fee-store';
import { StatementParser, BankStatementLine } from './statement-parser';
import {
  FeeReconciliationBatchItem,
  FeePaymentItem,
  ReconciliationSource,
  ReconciliationStatus,
} from '../types';
import { db } from '@/db';
import { feePayments } from '@thaiba/db/schema';
import { eq, inArray } from 'drizzle-orm';

export interface ReconciliationMatchResult {
  matchedPairs: Array<{
    bankLine: BankStatementLine;
    systemPayment: FeePaymentItem;
    confidenceScore: number;
    matchCriteria: string;
  }>;
  unmatchedBankLines: BankStatementLine[];
  unmatchedSystemPayments: FeePaymentItem[];
  totalBankCredit: number;
  totalSystemMatched: number;
  discrepancyAmount: number;
  status: ReconciliationStatus;
}

export class ReconciliationEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Reconciles bank statement lines against recorded fee payments
   */
  public async reconcileStatement(
    institutionId: string,
    statementCsv: string,
    sourceType: ReconciliationSource = 'bank_statement',
    statementDate: string = new Date().toISOString().split('T')[0]
  ): Promise<{ batch: FeeReconciliationBatchItem; result: ReconciliationMatchResult }> {
    const bankLines = StatementParser.parseCsv(statementCsv);
    const systemPayments = await this.store.listPayments(institutionId, undefined, 'completed');

    const matchedPairs: ReconciliationMatchResult['matchedPairs'] = [];
    const unmatchedBankLines: BankStatementLine[] = [];
    const matchedPaymentIds = new Set<string>();

    let totalBankCredit = 0;
    let totalSystemMatched = 0;

    for (const line of bankLines) {
      if (line.entryType === 'CR') {
        totalBankCredit += line.amount;
      }

      let matchedPayment: FeePaymentItem | undefined;
      let criteria = '';

      // Try matching by exact Reference / Payment Number / Gateway ID.
      // Exact equality (===) is used deliberately: substring matching caused
      // false positives where e.g. PAY-123 matched PAY-1234.
      for (const p of systemPayments) {
        if (matchedPaymentIds.has(p.id)) continue;

        const ref = line.referenceNumber || '';
        const desc = line.description || '';
        const isExactRef =
          (p.transactionReference && ref === p.transactionReference) ||
          ref === p.paymentNumber ||
          (p.gatewayPaymentId && ref === p.gatewayPaymentId) ||
          desc === p.paymentNumber;

        if (isExactRef) {
          if (Math.abs(p.netAmount - line.amount) <= 0.01) {
            matchedPayment = p;
            criteria = 'EXACT_REFERENCE_AND_AMOUNT';
            break;
          }
        }
      }

      // Match 2: If not matched, try matching by Amount + Date Window
      if (!matchedPayment && line.entryType === 'CR') {
        for (const p of systemPayments) {
          if (matchedPaymentIds.has(p.id)) continue;
          if (Math.abs(p.netAmount - line.amount) <= 0.01) {
            const payDate = new Date(p.paidAt).toISOString().split('T')[0];
            if (payDate === line.transactionDate) {
              matchedPayment = p;
              criteria = 'AMOUNT_AND_DATE_MATCH';
              break;
            }
          }
        }
      }

      if (matchedPayment) {
        matchedPaymentIds.add(matchedPayment.id);
        totalSystemMatched += matchedPayment.netAmount;
        matchedPairs.push({
          bankLine: line,
          systemPayment: matchedPayment,
          confidenceScore: criteria === 'EXACT_REFERENCE_AND_AMOUNT' ? 1.0 : 0.85,
          matchCriteria: criteria,
        });
      } else {
        unmatchedBankLines.push(line);
      }
    }

    const unmatchedSystemPayments = systemPayments.filter((p) => !matchedPaymentIds.has(p.id));
    const discrepancy = Math.abs(totalBankCredit - totalSystemMatched);
    const status: ReconciliationStatus =
      unmatchedBankLines.length === 0 && discrepancy < 0.01 ? 'reconciled' : 'discrepancy_flagged';

    const now = new Date().toISOString();
    const batchId = `batch_${crypto.randomUUID()}`;
    const batchNumber = `REC-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;

    const batch: FeeReconciliationBatchItem = {
      id: batchId,
      batchNumber,
      institutionId,
      sourceType,
      statementDate,
      totalTransactions: bankLines.length,
      matchedTransactions: matchedPairs.length,
      unmatchedTransactions: unmatchedBankLines.length,
      totalSettledAmount: totalBankCredit,
      feeChargesAmount: 0,
      netPayoutAmount: totalBankCredit,
      discrepancyAmount: discrepancy,
      status,
      reconciledAt: now,
      createdAt: now,
    };

    await this.store.createReconciliationBatch(batch);

    // Write back reconciliation status to matched payments so re-running the
    // engine does not re-match already-reconciled rows.
    const matchedIds = Array.from(matchedPaymentIds);
    if (matchedIds.length > 0) {
      try {
        await db
          .update(feePayments)
          .set({
            reconciledAt: now,
            reconciliationBatchId: batchId,
          })
          .where(inArray(feePayments.id, matchedIds));
      } catch (err) {
        console.warn('[ReconciliationEngine] Failed to write back reconciliation status:', err);
      }
    }

    return {
      batch,
      result: {
        matchedPairs,
        unmatchedBankLines,
        unmatchedSystemPayments,
        totalBankCredit,
        totalSystemMatched,
        discrepancyAmount: discrepancy,
        status,
      },
    };
  }
}
