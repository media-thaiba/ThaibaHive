import {
  MatchingLineItemInput,
  LineMatchResult,
  ThreeWayMatchEvaluationResult,
} from './matching-types';

export class ThreeWayMatchingEngine {
  private static instance: ThreeWayMatchingEngine;

  // Tolerances: 2% price variance, 0% quantity overbilling
  private readonly PRICE_TOLERANCE_PERCENT = 2.0;
  private readonly QUANTITY_TOLERANCE_UNITS = 0.0;

  public static getInstance(): ThreeWayMatchingEngine {
    if (!ThreeWayMatchingEngine.instance) {
      ThreeWayMatchingEngine.instance = new ThreeWayMatchingEngine();
    }
    return ThreeWayMatchingEngine.instance;
  }

  public reconcileDocuments(
    poId: string,
    invoiceId: string,
    receiptId: string | undefined,
    lines: MatchingLineItemInput[]
  ): ThreeWayMatchEvaluationResult {
    let totalDollarVarianceUsd = 0.0;
    let totalQuantityVarianceUnits = 0.0;
    let totalInvoiceAmountUsd = 0.0;
    let hasPriceVariance = false;
    let hasQuantityVariance = false;
    let hasMissingReceipt = false;

    const lineResults: LineMatchResult[] = [];

    for (const line of lines) {
      const lineInvoiceTotal = line.invoiceUnitPriceUsd * line.invoiceQuantityBilled;
      totalInvoiceAmountUsd += lineInvoiceTotal;

      // Price Variance calculation
      const priceDiff = line.invoiceUnitPriceUsd - line.poUnitPriceUsd;
      const priceVariancePercent =
        line.poUnitPriceUsd > 0
          ? Number(((priceDiff / line.poUnitPriceUsd) * 100).toFixed(2))
          : 0.0;

      // Quantity Variance calculation (Billed vs Received)
      const qtyDiff = line.invoiceQuantityBilled - line.grnQuantityReceived;

      // Dollar variance for this line
      const expectedTotal = line.poUnitPriceUsd * line.grnQuantityReceived;
      const lineDollarVariance = Number((lineInvoiceTotal - expectedTotal).toFixed(2));
      totalDollarVarianceUsd += lineDollarVariance;
      totalQuantityVarianceUnits += Math.max(0, qtyDiff);

      let lineStatus: 'matched' | 'price_variance' | 'quantity_variance' | 'missing_receipt' = 'matched';

      if (line.grnQuantityReceived === 0 && line.invoiceQuantityBilled > 0) {
        lineStatus = 'missing_receipt';
        hasMissingReceipt = true;
      } else if (qtyDiff > this.QUANTITY_TOLERANCE_UNITS) {
        lineStatus = 'quantity_variance';
        hasQuantityVariance = true;
      } else if (Math.abs(priceVariancePercent) > this.PRICE_TOLERANCE_PERCENT) {
        lineStatus = 'price_variance';
        hasPriceVariance = true;
      }

      lineResults.push({
        itemSku: line.itemSku,
        description: line.description,
        poUnitPriceUsd: line.poUnitPriceUsd,
        invoiceUnitPriceUsd: line.invoiceUnitPriceUsd,
        priceVariancePercent,
        poQuantityOrdered: line.poQuantityOrdered,
        grnQuantityReceived: line.grnQuantityReceived,
        invoiceQuantityBilled: line.invoiceQuantityBilled,
        quantityVarianceUnits: qtyDiff,
        dollarVarianceUsd: lineDollarVariance,
        status: lineStatus,
      });
    }

    const isToleranceCompliant = !hasPriceVariance && !hasQuantityVariance && !hasMissingReceipt;

    let overallMatchStatus: 'matched' | 'price_variance' | 'quantity_variance' | 'missing_receipt' = 'matched';
    let exceptionReason: string | undefined = undefined;

    if (hasMissingReceipt) {
      overallMatchStatus = 'missing_receipt';
      exceptionReason = 'Goods receipt not recorded or zero quantity received for billed items';
    } else if (hasQuantityVariance) {
      overallMatchStatus = 'quantity_variance';
      exceptionReason = `Billed quantity exceeds received quantity by ${totalQuantityVarianceUnits} units`;
    } else if (hasPriceVariance) {
      overallMatchStatus = 'price_variance';
      exceptionReason = `Unit price variance exceeds permitted tolerance threshold of ±${this.PRICE_TOLERANCE_PERCENT}%`;
    }

    let paymentVoucherCode: string | undefined = undefined;
    if (isToleranceCompliant) {
      paymentVoucherCode = `VOUCHER-AUTO-${Date.now().toString().slice(-6)}`;
    }

    return {
      poId,
      invoiceId,
      receiptId,
      overallMatchStatus,
      isToleranceCompliant,
      totalPriceVariancePercent: Number(
        (lines.reduce((acc, l) => acc + Math.abs(l.invoiceUnitPriceUsd - l.poUnitPriceUsd), 0) /
          Math.max(1, lines.reduce((acc, l) => acc + l.poUnitPriceUsd, 0)) *
          100).toFixed(2)
      ),
      totalQuantityVarianceUnits,
      totalDollarVarianceUsd: Number(totalDollarVarianceUsd.toFixed(2)),
      invoiceTotalAmountUsd: Number(totalInvoiceAmountUsd.toFixed(2)),
      lineResults,
      paymentVoucherCode,
      exceptionReason,
    };
  }
}
