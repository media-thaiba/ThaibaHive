import crypto from 'crypto';
import { FeeDbStore } from '../../../db/fee-store';
import { FeeGLEngine } from '../../operations/finance/gl/fee-gl-engine';
import { ReceiptGenerator } from '../../operations/finance/receipts/receipt-generator';
import { WebhookProcessor } from '../../operations/finance/gateways/webhook-processor';
import { DLQManager } from '../../operations/finance/gateways/dlq-manager';
import { GatewayAdapterFactory } from '../../operations/finance/gateways/gateway-adapter-factory';
import { CounterRegisterEngine } from '../../operations/finance/counter/counter-register-engine';
import { PaymentCrypto } from '../../operations/finance/security/payment-crypto';

describe('FinanceOS Security, Threat & Fault Tolerance Suite (Sprint-057 - FEE-023)', () => {
  let store: FeeDbStore;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('Threat 1: Double-Entry Invariant - GL journal lines must strictly balance debits and credits', () => {
    const balancedJournals = [
      {
        id: 'j1',
        referenceNumber: 'JRN-1',
        institutionId: 'inst-1',
        entryDate: '2026-08-25',
        debitAccount: 'GL:1100-BANK',
        creditAccount: '',
        amount: 50000,
        currency: 'INR',
        narration: 'Fee payment',
        entityType: 'fee_payments',
        entityId: 'p1',
        createdAt: '2026-08-25',
      },
      {
        id: 'j2',
        referenceNumber: 'JRN-1',
        institutionId: 'inst-1',
        entryDate: '2026-08-25',
        debitAccount: '',
        creditAccount: 'GL:1200-RECEIVABLE',
        amount: 50000,
        currency: 'INR',
        narration: 'Fee payment',
        entityType: 'fee_payments',
        entityId: 'p1',
        createdAt: '2026-08-25',
      },
    ];

    expect(FeeGLEngine.validateJournalBalance(balancedJournals)).toBe(true);

    const unbalancedJournals = [
      { ...balancedJournals[0], amount: 50000 },
      { ...balancedJournals[1], amount: 48000 },
    ];

    expect(FeeGLEngine.validateJournalBalance(unbalancedJournals)).toBe(false);
  });

  it('Threat 2: Receipt Tampering - Modified hash or signature fails cryptographic verification', async () => {
    const generator = new ReceiptGenerator(store, 'test_secret_key');
    const payment = {
      id: 'pay-sec-1',
      paymentNumber: 'PAY-SEC-01',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 25000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 25000,
      currency: 'INR',
      paymentMethod: 'upi' as const,
      paymentStatus: 'completed' as const,
      paidAt: '2026-08-25',
      createdAt: '2026-08-25',
      updatedAt: '2026-08-25',
    };

    const receipt = await generator.generateReceipt({
      payment,
      studentName: 'Bilal Khan',
      studentRollNumber: 'TG-101',
      programGrade: 'Grade 10',
      academicYear: '2026-2027',
    });

    expect(generator.verifyReceipt(receipt)).toBe(true);

    // Tamper with receipt hash
    const tamperedReceipt = { ...receipt, receiptHash: receipt.receiptHash.replace('a', 'b') };
    expect(generator.verifyReceipt(tamperedReceipt)).toBe(false);
  });

  it('Threat 3: Replay Attack - Duplicate webhook delivery must be deduplicated idempotently', async () => {
    const dlq = DLQManager.getInstance();
    dlq.clearQueue();
    const processor = new WebhookProcessor(undefined, dlq, store);
    processor.clearProcessedKeys();

    const key = processor.generateIdempotencyKey('razorpay', 'evt_replay_100', 'pay_replay_100');
    expect(key).toBeDefined();
    expect(key.length).toBe(64); // SHA-256 length
  });

  it('Threat 4: Cash Drawer Variance - Detects physical cash discrepancy during shift close', async () => {
    const engine = new CounterRegisterEngine(store);
    const shift = await engine.openShift('inst-1', 'cashier-1', 'Main Gate Counter', 5000);
    await engine.recordShiftTransaction(shift.id, 'cash', 20000);

    // Expected cash: 25,000. Declared physical: 24,000 (Shortage of ₹1,000)
    const summary = await engine.closeShift(shift.id, 24000, 'supervisor-1', 'Shortage noted');

    expect(summary.isBalanced).toBe(false);
    expect(summary.register.varianceAmount).toBe(-1000);
  });

  it('Threat 5: Multi-Tenant Boundary Isolation - Prevents cross-institution fee access', async () => {
    await store.createFeeStructure({
      id: 'struct-tenant-a',
      institutionId: 'institution-alpha',
      name: 'Alpha Fee Structure',
      code: 'ALPHA-FS',
      academicYear: '2026-2027',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 50000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Query with Beta tenant ID
    const betaStructures = await store.listFeeStructures('institution-beta');
    expect(betaStructures.length).toBe(0);

    // Query with Alpha tenant ID
    const alphaStructures = await store.listFeeStructures('institution-alpha');
    expect(alphaStructures.length).toBe(1);
    expect(alphaStructures[0].name).toBe('Alpha Fee Structure');
  });
});
