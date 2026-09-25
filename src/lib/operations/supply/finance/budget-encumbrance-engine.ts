import { SupplyBudgetEncumbranceItem } from '../supply-types';
import { EncumbranceValidationResult, DoubleEntryJournalEntry } from './finance-types';
import { ProcurementLedgerPoster } from './procurement-ledger-poster';

export class BudgetEncumbranceEngine {
  private static instance: BudgetEncumbranceEngine;

  public static getInstance(): BudgetEncumbranceEngine {
    if (!BudgetEncumbranceEngine.instance) {
      BudgetEncumbranceEngine.instance = new BudgetEncumbranceEngine();
    }
    return BudgetEncumbranceEngine.instance;
  }

  public validateBudgetHeadroom(
    departmentId: string,
    budgetCode: string,
    requestedAmountUsd: number,
    allocatedBudgetUsd: number,
    currentlyEncumberedUsd: number,
    currentlySpentUsd: number
  ): EncumbranceValidationResult {
    const committedTotal = currentlyEncumberedUsd + currentlySpentUsd;
    const availableHeadroomUsd = allocatedBudgetUsd - committedTotal;

    if (requestedAmountUsd > availableHeadroomUsd) {
      return {
        isEligible: false,
        departmentId,
        budgetCode,
        requestedAmountUsd,
        allocatedBudgetUsd,
        currentlyEncumberedUsd,
        currentlySpentUsd,
        availableHeadroomUsd,
        error: `Insufficient budget headroom. Requested $${requestedAmountUsd} exceeds available $${availableHeadroomUsd}.`,
      };
    }

    const remainingAfterRequest = availableHeadroomUsd - requestedAmountUsd;
    const warning =
      remainingAfterRequest / allocatedBudgetUsd < 0.15
        ? `Warning: This commitment leaves less than 15% budget headroom ($${remainingAfterRequest.toFixed(2)} remaining).`
        : undefined;

    return {
      isEligible: true,
      departmentId,
      budgetCode,
      requestedAmountUsd,
      allocatedBudgetUsd,
      currentlyEncumberedUsd,
      currentlySpentUsd,
      availableHeadroomUsd,
      warning,
    };
  }

  public lockEncumbrance(
    poId: string,
    departmentId: string,
    budgetCode: string,
    amountUsd: number,
    institutionId = 'global'
  ): {
    encumbrance: SupplyBudgetEncumbranceItem;
    journalEntry: DoubleEntryJournalEntry;
  } {
    const encNumber = `ENC-${Date.now().toString().slice(-6)}`;
    const encId = `enc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const encumbrance: SupplyBudgetEncumbranceItem = {
      id: encId,
      encumbranceNumber: encNumber,
      departmentId,
      budgetCode,
      poId,
      encumberedAmountUsd: amountUsd,
      liquidatedAmountUsd: 0.0,
      remainingEncumberedUsd: amountUsd,
      status: 'active',
      debitAccountCode: 'GL:ENCUMBRANCE_EXPENSE',
      creditAccountCode: 'GL:ENCUMBRANCE_RESERVE',
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const journalEntry: DoubleEntryJournalEntry = {
      id: `tx-enc-${Date.now()}`,
      transactionNumber: `TX-${Date.now().toString().slice(-6)}`,
      poId,
      debitAccount: 'GL:ENCUMBRANCE_EXPENSE',
      creditAccount: 'GL:ENCUMBRANCE_RESERVE',
      amountUsd,
      entryType: 'ENCUMBRANCE_HOLD',
      timestamp: new Date().toISOString(),
      memo: `Pre-commitment fund hold for Purchase Order ${poId}`,
      institutionId,
    };

    ProcurementLedgerPoster.postJournalEntry(journalEntry);

    return { encumbrance, journalEntry };
  }

  public liquidateOnInvoiceMatch(
    poId: string,
    invoiceId: string,
    matchedAmountUsd: number,
    institutionId = 'global'
  ): {
    liquidationEntry: DoubleEntryJournalEntry;
    payableEntry: DoubleEntryJournalEntry;
  } {
    // 1. Liquidate Encumbrance Reserve
    const liquidationEntry: DoubleEntryJournalEntry = {
      id: `tx-liq-${Date.now()}-1`,
      transactionNumber: `TX-LIQ-${Date.now().toString().slice(-6)}`,
      poId,
      invoiceId,
      debitAccount: 'GL:ENCUMBRANCE_RESERVE',
      creditAccount: 'GL:ENCUMBRANCE_EXPENSE',
      amountUsd: matchedAmountUsd,
      entryType: 'ENCUMBRANCE_LIQUIDATION',
      timestamp: new Date().toISOString(),
      memo: `Encumbrance liquidation for matched Invoice ${invoiceId}`,
      institutionId,
    };

    // 2. Recognize Actual Operating Expense & Accounts Payable
    const payableEntry: DoubleEntryJournalEntry = {
      id: `tx-liq-${Date.now()}-2`,
      transactionNumber: `TX-AP-${Date.now().toString().slice(-6)}`,
      poId,
      invoiceId,
      debitAccount: 'GL:ACTUAL_OPERATING_EXPENSE',
      creditAccount: 'GL:ACCOUNTS_PAYABLE',
      amountUsd: matchedAmountUsd,
      entryType: 'ACCOUNTS_PAYABLE_RECOGNITION',
      timestamp: new Date().toISOString(),
      memo: `Accounts payable recognition for matched Invoice ${invoiceId}`,
      institutionId,
    };

    ProcurementLedgerPoster.postJournalEntry(liquidationEntry);
    ProcurementLedgerPoster.postJournalEntry(payableEntry);

    return { liquidationEntry, payableEntry };
  }
}
