// ─── FEE-HIVE / FinanceOS Types (Sprint-057) ───

export type FeeQuota = 'general' | 'merit' | 'management' | 'nri' | 'sports';
export type ResidentialType = 'day_scholar' | 'hosteller' | 'boarder';
export type ComponentType =
  | 'tuition'
  | 'admission'
  | 'hostel'
  | 'transport'
  | 'lab'
  | 'library'
  | 'exam'
  | 'extracurricular'
  | 'misc';

export type AllocationStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue';
export type InstallmentStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
export type PaymentMethod =
  | 'razorpay'
  | 'stripe'
  | 'upi'
  | 'cash'
  | 'pos_card'
  | 'bank_transfer'
  | 'cheque'
  | 'dd';
export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'chargeback';

export type ScholarshipCategory =
  | 'merit'
  | 'need_based'
  | 'sports'
  | 'sibling'
  | 'staff_ward'
  | 'orphan'
  | 'special_grant';

export type DiscountType = 'percentage' | 'fixed_amount';
export type ConcessionStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type CounterStatus = 'open' | 'closed' | 'verified' | 'disputed';
export type AgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus';
export type DefaulterAction =
  | 'reminder_sent'
  | 'hall_ticket_blocked'
  | 'guardian_contacted'
  | 'escalated_to_principal';
export type OutreachChannel = 'whatsapp' | 'sms' | 'email' | 'manual_call';
export type ReconciliationSource =
  | 'razorpay_settlement'
  | 'stripe_payout'
  | 'bank_statement'
  | 'pos_terminal';
export type ReconciliationStatus = 'in_progress' | 'reconciled' | 'discrepancy_flagged';

export type FeeAuditAction =
  | 'structure_created'
  | 'structure_updated'
  | 'fee_allocated'
  | 'payment_received'
  | 'payment_refunded'
  | 'receipt_issued'
  | 'scholarship_approved'
  | 'concession_granted'
  | 'counter_shift_closed'
  | 'statement_reconciled'
  | 'defaulter_notified';

export interface FeeStructureComponentItem {
  id: string;
  feeStructureId: string;
  name: string;
  componentType: ComponentType;
  amount: number;
  isMandatory: boolean;
  isRefundable: boolean;
  taxRatePercent: number;
  glAccountCode: string;
  createdAt: string;
}

export interface FeeStructureItem {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  academicYear: string;
  programId?: string | null;
  gradeLevel?: string | null;
  term: string;
  quota: FeeQuota;
  residentialType: ResidentialType;
  currency: string;
  totalAmount: number;
  isActive: boolean;
  metadataJson?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  components?: FeeStructureComponentItem[];
}

export interface FeeInstallmentItem {
  id: string;
  allocationId: string;
  installmentNumber: number;
  title: string;
  dueDate: string;
  gracePeriodDays: number;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  fineAmount: number;
  fineWaivedAmount: number;
  status: InstallmentStatus;
  lastPaymentDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStudentAllocationItem {
  id: string;
  institutionId: string;
  studentId: string;
  feeStructureId: string;
  academicYear: string;
  baseAmount: number;
  concessionAmount: number;
  netPayableAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: AllocationStatus;
  allocationDate: string;
  dueDate?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  installments?: FeeInstallmentItem[];
}

export interface FeePaymentTransactionItem {
  id: string;
  paymentId: string;
  installmentId?: string | null;
  componentId?: string | null;
  allocatedAmount: number;
  glDebitAccount: string;
  glCreditAccount: string;
  createdAt: string;
}

export interface FeePaymentItem {
  id: string;
  paymentNumber: string;
  institutionId: string;
  allocationId: string;
  studentId: string;
  amount: number;
  fineAmount: number;
  discountAmount: number;
  netAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  transactionReference?: string | null;
  counterRegisterId?: string | null;
  payerName?: string | null;
  payerPhone?: string | null;
  payerEmail?: string | null;
  receiptNumber?: string | null;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  transactions?: FeePaymentTransactionItem[];
}

export interface FeeReceiptItem {
  id: string;
  receiptNumber: string;
  institutionId: string;
  paymentId: string;
  studentId: string;
  docGeneratedRecordId?: string | null;
  receiptHash: string;
  signature: string;
  qrPayload: string;
  receiptHtml?: string | null;
  receiptPdfUrl?: string | null;
  downloadCount: number;
  issuedAt: string;
  createdAt: string;
}

export interface FeeScholarshipItem {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  category: ScholarshipCategory;
  discountType: DiscountType;
  discountValue: number;
  targetComponentType: string;
  totalBudget: number;
  disbursedAmount: number;
  academicYear: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeConcessionItem {
  id: string;
  institutionId: string;
  studentId: string;
  scholarshipId?: string | null;
  allocationId: string;
  amount: number;
  reason: string;
  supportingDocUrl?: string | null;
  status: ConcessionStatus;
  appliedById: string;
  approvedById?: string | null;
  decisionNotes?: string | null;
  decisionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeCounterRegisterItem {
  id: string;
  institutionId: string;
  cashierId: string;
  counterName: string;
  openingFloat: number;
  closingCashDeclared?: number | null;
  systemCashTotal: number;
  systemPosTotal: number;
  systemChequeTotal: number;
  cashDropsTotal: number;
  varianceAmount: number;
  status: CounterStatus;
  openedAt: string;
  closedAt?: string | null;
  supervisorId?: string | null;
  supervisorNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeDefaulterLogItem {
  id: string;
  institutionId: string;
  studentId: string;
  allocationId: string;
  agingDays: number;
  agingBucket: AgingBucket;
  overdueAmount: number;
  riskScore: number;
  actionTaken: DefaulterAction;
  channel?: OutreachChannel | null;
  dispatchedAt: string;
  createdAt: string;
}

export interface FeeReconciliationBatchItem {
  id: string;
  batchNumber: string;
  institutionId: string;
  sourceType: ReconciliationSource;
  statementDate: string;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  totalSettledAmount: number;
  feeChargesAmount: number;
  netPayoutAmount: number;
  discrepancyAmount: number;
  status: ReconciliationStatus;
  reconciledById?: string | null;
  reconciledAt?: string | null;
  createdAt: string;
}

export interface FeeAuditLogItem {
  id: string;
  auditId: string;
  institutionId: string;
  actorId: string;
  actorRole: string;
  action: FeeAuditAction;
  entityType: string;
  entityId: string;
  payloadHash: string;
  timestamp: string;
  createdAt: string;
}

export interface GLJournalEntry {
  id: string;
  referenceNumber: string;
  institutionId: string;
  entryDate: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  narration: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}
