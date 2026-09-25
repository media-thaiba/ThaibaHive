import { FeeDbStore } from '../../../../db/fee-store';
import { StatementParser, BankStatementLine } from './statement-parser';
import {
  FeeReconciliationBatchItem,
  FeePaymentItem,
  ReconciliationSource,
  ReconciliationStatus,
} from '../types';

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

      // Try matching by exact Reference / Payment Number / Gateway ID
      let matchedPayment: FeePaymentItem | undefined;
      let criteria = '';

      for (const p of systemPayments) {
        if (matchedPaymentIds.has(p.id)) continue;

        // Match 1: Exact transactionReference or paymentNumber
        if (
          (p.transactionReference && line.referenceNumber.includes(p.transactionReference)) ||
          line.referenceNumber.includes(p.paymentNumber) ||
          (p.gatewayPaymentId && line.referenceNumber.includes(p.gatewayPaymentId)) ||
          line.description.includes(p.paymentNumber)
        ) {
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

    const batchNumber = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const batch: FeeReconciliationBatchItem = {
      id: `batch_${Date.now()}`,
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
      reconciledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await this.store.createReconciliationBatch(batch);

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
