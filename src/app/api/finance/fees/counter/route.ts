import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { CounterRegisterEngine } from '@/lib/operations/finance/counter/counter-register-engine';
import {
  openCounterRegisterSchema,
  closeCounterRegisterSchema,
  recordCounterPaymentSchema,
} from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const status = (url.searchParams.get('status') as any) || undefined;

  const store = FeeDbStore.getInstance();
  const list = await store.listCounterRegisters(institutionId, status);
  return NextResponse.json({ success: true, registers: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const action = body.action || 'open';
    const store = FeeDbStore.getInstance();
    const engine = new CounterRegisterEngine(store);

    if (action === 'open') {
      const parsed = openCounterRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const register = await engine.openShift(
        parsed.data.institutionId,
        session.staffId || (session as any).userId || 'staff',
        parsed.data.counterName,
        parsed.data.openingFloat
      );

      return NextResponse.json({ success: true, register }, { status: 201 });
    }

    if (action === 'record_payment') {
      const parsed = recordCounterPaymentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const updatedShift = await engine.recordShiftTransaction(
        parsed.data.shiftId,
        parsed.data.paymentMethod,
        parsed.data.amount
      );

      const paymentId = `pay_counter_${Date.now()}`;
      const paymentNumber = `RCPT-CASH-${Date.now().toString().slice(-6)}`;

      const payment = await store.recordPayment({
        id: paymentId,
        paymentNumber,
        institutionId: updatedShift.institutionId,
        allocationId: parsed.data.allocationId,
        studentId: parsed.data.studentId,
        amount: parsed.data.amount,
        fineAmount: 0,
        discountAmount: 0,
        netAmount: parsed.data.amount,
        currency: 'INR',
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: 'completed',
        counterRegisterId: updatedShift.id,
        transactionReference: parsed.data.transactionReference || paymentNumber,
        payerName: parsed.data.payerName,
        payerPhone: parsed.data.payerPhone,
        receiptNumber: paymentNumber,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, payment, register: updatedShift }, { status: 201 });
    }

    if (action === 'close') {
      const parsed = closeCounterRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const summary = await engine.closeShift(
        parsed.data.shiftId,
        parsed.data.closingCashDeclared,
        session.staffId || (session as any).userId || 'staff',
        parsed.data.supervisorNotes
      );

      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: 'Invalid counter action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Counter operation failed' }, { status: 500 });
  }
}, 'finance:fees:collect');
