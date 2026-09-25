import { ComponentType, PaymentMethod } from '../types';

export const STANDARD_GL_ACCOUNTS = {
  // Assets
  BANK_CASH: 'GL:1100-BANK_CASH',
  COUNTER_CASH: 'GL:1110-COUNTER_CASH_DRAWER',
  POS_CLEARING: 'GL:1120-POS_SETTLEMENT_CLEARING',
  GATEWAY_CLEARING: 'GL:1130-GATEWAY_CLEARING',
  FEE_RECEIVABLE: 'GL:1200-FEE_RECEIVABLE',

  // Liabilities
  CAUTION_DEPOSIT: 'GL:2100-CAUTION_DEPOSIT_PAYABLE',
  ADVANCE_FEES: 'GL:2200-ADVANCE_FEES_RECEIVED',
  UNALLOCATED_SUSPENSE: 'GL:2300-UNALLOCATED_SUSPENSE',

  // Revenue
  TUITION_REVENUE: 'GL:4100-TUITION_REVENUE',
  HOSTEL_REVENUE: 'GL:4200-HOSTEL_REVENUE',
  TRANSPORT_REVENUE: 'GL:4300-TRANSPORT_REVENUE',
  LAB_EXAM_REVENUE: 'GL:4400-LAB_EXAM_REVENUE',
  MISC_FEE_REVENUE: 'GL:4500-MISC_FEE_REVENUE',
  LATE_FINE_INCOME: 'GL:4900-LATE_FINE_INCOME',

  // Expenses
  SCHOLARSHIP_EXPENSE: 'GL:5100-SCHOLARSHIP_EXPENSE',
  GATEWAY_FEE_EXPENSE: 'GL:5200-GATEWAY_PROCESSING_FEES',
} as const;

export function resolveComponentRevenueAccount(type: ComponentType): string {
  switch (type) {
    case 'tuition':
    case 'admission':
      return STANDARD_GL_ACCOUNTS.TUITION_REVENUE;
    case 'hostel':
      return STANDARD_GL_ACCOUNTS.HOSTEL_REVENUE;
    case 'transport':
      return STANDARD_GL_ACCOUNTS.TRANSPORT_REVENUE;
    case 'lab':
    case 'exam':
    case 'library':
      return STANDARD_GL_ACCOUNTS.LAB_EXAM_REVENUE;
    default:
      return STANDARD_GL_ACCOUNTS.MISC_FEE_REVENUE;
  }
}

export function resolvePaymentAssetAccount(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return STANDARD_GL_ACCOUNTS.COUNTER_CASH;
    case 'pos_card':
      return STANDARD_GL_ACCOUNTS.POS_CLEARING;
    case 'razorpay':
    case 'stripe':
    case 'upi':
      return STANDARD_GL_ACCOUNTS.GATEWAY_CLEARING;
    case 'bank_transfer':
    case 'cheque':
    case 'dd':
      return STANDARD_GL_ACCOUNTS.BANK_CASH;
    default:
      return STANDARD_GL_ACCOUNTS.BANK_CASH;
  }
}
