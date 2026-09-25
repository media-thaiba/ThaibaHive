import { z } from 'zod';

export const feeComponentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  componentType: z.enum(['tuition', 'admission', 'hostel', 'transport', 'lab', 'library', 'exam', 'extracurricular', 'misc']),
  amount: z.number().nonnegative(),
  isMandatory: z.boolean().default(true),
  isRefundable: z.boolean().default(false),
  taxRatePercent: z.number().min(0).max(100).default(0),
  glAccountCode: z.string().default('GL:4100-FEE_REVENUE'),
});

export const createFeeStructureSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(3),
  code: z.string().min(2),
  academicYear: z.string().min(4),
  programId: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  term: z.string().default('annual'),
  quota: z.enum(['general', 'merit', 'management', 'nri', 'sports']).default('general'),
  residentialType: z.enum(['day_scholar', 'hosteller', 'boarder']).default('day_scholar'),
  currency: z.string().default('INR'),
  totalAmount: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
  components: z.array(feeComponentSchema).optional(),
});

export const allocateFeeSchema = z.object({
  institutionId: z.string().min(1),
  studentId: z.string().min(1),
  feeStructureId: z.string().min(1),
  academicYear: z.string().min(4),
  customConcessionAmount: z.number().min(0).default(0),
  planType: z.enum(['lump_sum', 'semesterly', 'quarterly', 'custom']).default('semesterly'),
});

export const createCheckoutOrderSchema = z.object({
  allocationId: z.string().min(1),
  installmentId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  paymentMethod: z.enum(['razorpay', 'stripe', 'upi', 'pos_card', 'cash', 'bank_transfer', 'cheque', 'dd']),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
});

export const recordCounterPaymentSchema = z.object({
  shiftId: z.string().min(1),
  allocationId: z.string().min(1),
  studentId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'pos_card', 'cheque', 'dd']),
  transactionReference: z.string().optional(),
  payerName: z.string().optional(),
  payerPhone: z.string().optional(),
});

export const applyConcessionSchema = z.object({
  institutionId: z.string().min(1),
  studentId: z.string().min(1),
  allocationId: z.string().min(1),
  scholarshipId: z.string().optional(),
  amount: z.number().positive(),
  reason: z.string().min(5),
  supportingDocUrl: z.string().optional(),
});

export const openCounterRegisterSchema = z.object({
  institutionId: z.string().min(1),
  counterName: z.string().min(2),
  openingFloat: z.number().nonnegative(),
});

export const closeCounterRegisterSchema = z.object({
  shiftId: z.string().min(1),
  closingCashDeclared: z.number().nonnegative(),
  supervisorNotes: z.string().optional(),
});

export const reconcileStatementSchema = z.object({
  institutionId: z.string().min(1),
  statementCsv: z.string().min(10),
  sourceType: z.enum(['razorpay_settlement', 'stripe_payout', 'bank_statement', 'pos_terminal']).default('bank_statement'),
  statementDate: z.string().optional(),
});

export const dispatchReminderSchema = z.object({
  institutionId: z.string().min(1),
  allocationId: z.string().min(1),
  studentName: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'email', 'manual_call']).default('whatsapp'),
});
