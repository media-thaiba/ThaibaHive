import crypto from 'crypto';
import { FeeDbStore } from '../../../../db/fee-store';
import { renderReceiptHtml, numberToWords, ReceiptTemplateData } from './receipt-template';
import {
  FeePaymentItem,
  FeeReceiptItem,
  FeeStudentAllocationItem,
  FeeStructureItem,
} from '../types';

export interface GenerateReceiptParams {
  payment: FeePaymentItem;
  allocation?: FeeStudentAllocationItem;
  structure?: FeeStructureItem;
  studentName: string;
  studentRollNumber: string;
  programGrade: string;
  academicYear: string;
  institutionName?: string;
  institutionAddress?: string;
  components?: Array<{ name: string; amount: number; tax?: number; total: number }>;
}

export class ReceiptGenerator {
  private store: FeeDbStore;
  private secretKey: string;

  constructor(store?: FeeDbStore, secretKey?: string) {
    this.store = store || FeeDbStore.getInstance();
    this.secretKey = secretKey || process.env.RECEIPT_SIGNING_SECRET || 'thaiba_receipt_signing_key_2026';
  }

  /**
   * Generates a lightweight pure SVG vector QR code placeholder
   */
  public generateQrSvg(verifyUrl: string): string {
    const hash = crypto.createHash('md5').update(verifyUrl).digest('hex');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <rect width="100" height="100" fill="#ffffff" stroke="#e2e8f0" rx="4"/>
      <rect x="10" y="10" width="24" height="24" fill="#1E3A8A"/>
      <rect x="14" y="14" width="16" height="16" fill="#ffffff"/>
      <rect x="18" y="18" width="8" height="8" fill="#1E3A8A"/>
      <rect x="66" y="10" width="24" height="24" fill="#1E3A8A"/>
      <rect x="70" y="14" width="16" height="16" fill="#ffffff"/>
      <rect x="74" y="18" width="8" height="8" fill="#1E3A8A"/>
      <rect x="10" y="66" width="24" height="24" fill="#1E3A8A"/>
      <rect x="14" y="70" width="16" height="16" fill="#ffffff"/>
      <rect x="18" y="74" width="8" height="8" fill="#1E3A8A"/>
      <rect x="42" y="42" width="16" height="16" fill="#1E3A8A" opacity="0.8"/>
      <rect x="42" y="16" width="16" height="8" fill="#1E3A8A" opacity="0.6"/>
      <rect x="66" y="42" width="12" height="16" fill="#1E3A8A" opacity="0.7"/>
      <rect x="42" y="66" width="16" height="12" fill="#1E3A8A" opacity="0.9"/>
      <text x="50" y="94" font-size="5" font-family="monospace" text-anchor="middle" fill="#64748B">${hash.slice(0, 8)}</text>
    </svg>`;
  }

  /**
   * Generates, cryptographically signs, and saves an official fee receipt
   */
  public async generateReceipt(params: GenerateReceiptParams): Promise<FeeReceiptItem> {
    const payment = params.payment;
    const receiptNumber = payment.receiptNumber || `RCPT-${new Date().getFullYear()}-${payment.paymentNumber.replace(/\D/g, '').slice(-5) || Math.floor(10000 + Math.random() * 90000)}`;

    const items = params.components && params.components.length > 0
      ? params.components
      : [
          {
            name: 'Academic Fee Installment',
            amount: payment.amount,
            tax: 0,
            total: payment.amount,
          },
        ];

    const rawCanonical = JSON.stringify({
      receiptNumber,
      institutionId: payment.institutionId,
      studentRollNumber: params.studentRollNumber,
      amount: payment.netAmount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
    });

    const receiptHash = crypto.createHash('sha256').update(rawCanonical).digest('hex');
    const signature = crypto.createHmac('sha256', this.secretKey).update(receiptHash).digest('hex');

    const verifyUrl = `/verify/receipt/${receiptHash}`;
    const qrSvg = this.generateQrSvg(verifyUrl);

    const templateData: ReceiptTemplateData = {
      receiptNumber,
      receiptDate: new Date(payment.paidAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      institutionName: params.institutionName || 'Thaiba Garden Group of Institutions',
      institutionAddress: params.institutionAddress || 'Knowledge City Campus, Thaiba Garden',
      studentName: params.studentName,
      studentRollNumber: params.studentRollNumber,
      programGrade: params.programGrade,
      academicYear: params.academicYear,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference || payment.paymentNumber,
      payerName: payment.payerName || params.studentName,
      items,
      grossAmount: payment.amount,
      fineAmount: payment.fineAmount,
      discountAmount: payment.discountAmount,
      netPaidAmount: payment.netAmount,
      amountInWords: numberToWords(payment.netAmount),
      balanceDueAmount: params.allocation?.balanceAmount || 0,
      receiptHash,
      signature,
      qrSvg,
    };

    const receiptHtml = renderReceiptHtml(templateData);

    const receiptItem: FeeReceiptItem = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNumber,
      institutionId: payment.institutionId,
      paymentId: payment.id,
      studentId: payment.studentId,
      receiptHash,
      signature,
      qrPayload: verifyUrl,
      receiptHtml,
      receiptPdfUrl: `/api/finance/fees/receipts/download/${receiptHash}`,
      downloadCount: 0,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await this.store.createReceipt(receiptItem);
    return receiptItem;
  }

  /**
   * Verifies receipt authenticity against HMAC signature
   */
  public verifyReceipt(receipt: FeeReceiptItem): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(receipt.receiptHash)
      .digest('hex');
    return expectedSignature === receipt.signature;
  }
}
