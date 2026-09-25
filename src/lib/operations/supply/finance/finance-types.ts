/**
 * Budget Encumbrance & Double-Entry Ledger Types
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface DoubleEntryJournalEntry {
  id: string;
  transactionNumber: string;
  poId: string;
  invoiceId?: string;
  debitAccount: string;
  creditAccount: string;
  amountUsd: number;
  entryType: 'ENCUMBRANCE_HOLD' | 'ENCUMBRANCE_LIQUIDATION' | 'ACCOUNTS_PAYABLE_RECOGNITION' | 'PAYMENT_DISBURSEMENT';
  timestamp: string;
  memo: string;
  institutionId: string;
}

export interface EncumbranceValidationResult {
  isEligible: boolean;
  departmentId: string;
  budgetCode: string;
  requestedAmountUsd: number;
  allocatedBudgetUsd: number;
  currentlyEncumberedUsd: number;
  currentlySpentUsd: number;
  availableHeadroomUsd: number;
  warning?: string;
  error?: string;
}
