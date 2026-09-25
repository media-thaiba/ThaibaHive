import { FeeDbStore } from '../../../db/fee-store';
import { ReceiptGenerator } from '../../operations/finance/receipts/receipt-generator';
import { FeePaymentItem } from '../../operations/finance/types';

describe('ReceiptGenerator & QR Cryptographic Verification (Sprint-057 - FEE-010)', () => {
  let store: FeeDbStore;
  let generator: ReceiptGenerator;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    generator = new ReceiptGenerator(store, 'test_receipt_secret_123');
  });

  it('should generate cryptographically signed receipt with pure vector QR code and verify authenticity', async () => {
    const payment: FeePaymentItem = {
      id: 'pay_rcpt_001',
      paymentNumber: 'PAY-2026-9999',
      institutionId: 'campus-central',
      allocationId: 'alloc-100',
      studentId: 'stud-100',
      amount: 60000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 60000,
      currency: 'INR',
      paymentMethod: 'upi',
      paymentStatus: 'completed',
      transactionReference: 'UPI-REF-998877',
      paidAt: '2026-08-20T14:30:00.000Z',
      createdAt: '2026-08-20T14:30:00.000Z',
      updatedAt: '2026-08-20T14:30:00.000Z',
    };

    const receipt = await generator.generateReceipt({
      payment,
      studentName: 'Zainab Abdullah',
      studentRollNumber: 'TG-2026-CS-042',
      programGrade: 'B.Tech Computer Science Year 2',
      academicYear: '2026-2027',
      components: [
        { name: 'Tuition Fee - Term 1', amount: 45000, tax: 0, total: 45000 },
        { name: 'Computer Lab Fee', amount: 15000, tax: 0, total: 15000 },
      ],
    });

    expect(receipt.receiptNumber).toBeDefined();
    expect(receipt.receiptHash).toBeDefined();
    expect(receipt.signature).toBeDefined();
    expect(receipt.receiptHtml).toContain('Zainab Abdullah');
    expect(receipt.receiptHtml).toContain('TG-2026-CS-042');
    expect(receipt.receiptHtml).toContain('Sixty Thousand Rupees Only');
    expect(receipt.receiptHtml).toContain('<svg');

    // Authenticity Check
    const isValid = generator.verifyReceipt(receipt);
    expect(isValid).toBe(true);

    // Tampered Hash Check
    const tampered = { ...receipt, receiptHash: 'tampered_hash_abc' };
    expect(generator.verifyReceipt(tampered)).toBe(false);
  });
});
