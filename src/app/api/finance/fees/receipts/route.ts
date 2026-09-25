import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { ReceiptGenerator } from '@/lib/operations/finance/receipts/receipt-generator';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('paymentId');
  const receiptHash = url.searchParams.get('hash');

  const store = FeeDbStore.getInstance();
  if (receiptHash) {
    const rcpt = await store.getReceiptByHash(receiptHash);
    if (!rcpt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json({ success: true, receipt: rcpt });
  }

  if (paymentId) {
    const rcpt = await store.getReceiptByPaymentId(paymentId);
    if (!rcpt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json({ success: true, receipt: rcpt });
  }

  return NextResponse.json({ error: 'paymentId or hash query parameter required' }, { status: 400 });
}, 'finance:fees:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const { paymentId, studentName, studentRollNumber, programGrade, academicYear, components } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const payment = await store.getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const generator = new ReceiptGenerator(store);
    const receipt = await generator.generateReceipt({
      payment,
      studentName: studentName || payment.payerName || 'Student',
      studentRollNumber: studentRollNumber || 'TG-STD-001',
      programGrade: programGrade || 'Academic Program',
      academicYear: academicYear || '2026-2027',
      components,
    });

    return NextResponse.json({ success: true, receipt }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate receipt' }, { status: 500 });
  }
}, 'finance:fees:collect');
