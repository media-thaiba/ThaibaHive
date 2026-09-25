import { DebitMemoItem, ThreeWayMatchEvaluationResult } from './matching-types';

export class DebitMemoGenerator {
  public static generateDebitMemo(
    vendorId: string,
    matchEvaluation: ThreeWayMatchEvaluationResult,
    institutionId = 'global'
  ): DebitMemoItem | null {
    if (matchEvaluation.isToleranceCompliant || matchEvaluation.totalDollarVarianceUsd <= 0) {
      return null;
    }

    const memoNumber = `DM-AUTO-${Date.now().toString().slice(-6)}`;
    const lineItems = matchEvaluation.lineResults
      .filter((l) => l.dollarVarianceUsd > 0)
      .map((l) => ({
        itemSku: l.itemSku,
        varianceUnits: Math.max(0, l.quantityVarianceUnits),
        varianceAmountUsd: l.dollarVarianceUsd,
        reason:
          l.status === 'quantity_variance'
            ? `Billed ${l.invoiceQuantityBilled} units vs received ${l.grnQuantityReceived} units`
            : `Unit price discrepancy: Billed $${l.invoiceUnitPriceUsd} vs PO $${l.poUnitPriceUsd}`,
      }));

    return {
      memoNumber,
      vendorId,
      poId: matchEvaluation.poId,
      invoiceId: matchEvaluation.invoiceId,
      deductionAmountUsd: matchEvaluation.totalDollarVarianceUsd,
      reason: matchEvaluation.exceptionReason || '3-Way Match discrepancy deduction',
      lineItems,
      issuedDate: new Date().toISOString(),
      status: 'issued',
      institutionId,
    };
  }
}
