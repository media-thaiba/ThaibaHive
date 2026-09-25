/**
 * 3-Way Matching & Discrepancy Resolution Types
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

import { ThreeWayMatchStatus } from '../supply-types';

export interface MatchingLineItemInput {
  itemSku: string;
  description: string;
  poUnitPriceUsd: number;
  poQuantityOrdered: number;
  grnQuantityReceived: number;
  invoiceUnitPriceUsd: number;
  invoiceQuantityBilled: number;
}

export interface LineMatchResult {
  itemSku: string;
  description: string;
  poUnitPriceUsd: number;
  invoiceUnitPriceUsd: number;
  priceVariancePercent: number;
  poQuantityOrdered: number;
  grnQuantityReceived: number;
  invoiceQuantityBilled: number;
  quantityVarianceUnits: number;
  dollarVarianceUsd: number;
  status: 'matched' | 'price_variance' | 'quantity_variance' | 'missing_receipt';
}

export interface ThreeWayMatchEvaluationResult {
  poId: string;
  invoiceId: string;
  receiptId?: string;
  overallMatchStatus: ThreeWayMatchStatus;
  isToleranceCompliant: boolean;
  totalPriceVariancePercent: number;
  totalQuantityVarianceUnits: number;
  totalDollarVarianceUsd: number;
  invoiceTotalAmountUsd: number;
  lineResults: LineMatchResult[];
  paymentVoucherCode?: string;
  exceptionReason?: string;
}

export interface DebitMemoItem {
  memoNumber: string;
  vendorId: string;
  poId: string;
  invoiceId: string;
  deductionAmountUsd: number;
  reason: string;
  lineItems: {
    itemSku: string;
    varianceUnits: number;
    varianceAmountUsd: number;
    reason: string;
  }[];
  issuedDate: string;
  status: 'issued' | 'applied' | 'disputed';
  institutionId: string;
}
