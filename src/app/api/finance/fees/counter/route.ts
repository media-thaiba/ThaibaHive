import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { FeeDbStore } from '@/db/fee-store';
import { CounterRegisterEngine } from '@/lib/operations/finance/counter/counter-register-engine';
import {
  openCounterRegisterSchema,
  closeCounterRegisterSchema,
  recordCounterPaymentSchema,
} from '@/lib/validation/fee-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
  const status = (url.searchParams.get('status') as any) || undefined;

  const store = FeeDbStore.getInstance();
  const list = await store.listCounterRegisters(institutionId, status);
  return NextResponse.json({ success: true, registers: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const action = body.action || 'open';
    const store = FeeDbStore.getInstance();
    const engine = new CounterRegisterEngine(store);

    if (action === 'open') {
      const parsed = openCounterRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);

      const register = await engine.openShift(
        institutionId,
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

      // Server-side allocation & amount guard: counter payments are validated
      // against the tenant-scoped allocation, never against client claims.
      const instFilter =
        session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;
      const allocation = await store.getAllocationById(parsed.data.allocationId, instFilter);
      if (!allocation) {
        return NextResponse.json({ error: 'Fee allocation not found' }, { status: 404 });
      }
      if (allocation.studentId !== parsed.data.studentId) {
        return NextResponse.json(
          { error: 'Student does not match the fee allocation' },
          { status: 400 }
        );
      }

      const requestedAmount = Number(parsed.data.amount.toFixed(2));
      if (allocation.balanceAmount <= 0) {
        return NextResponse.json({ error: 'No outstanding balance to collect' }, { status: 409 });
      }
      if (requestedAmount > allocation.balanceAmount) {
        return NextResponse.json(
          { error: `Amount exceeds outstanding balance of ₹${allocation.balanceAmount.toFixed(2)}` },
          { status: 400 }
        );
      }

      const updatedShift = await engine.recordShiftTransaction(
        parsed.data.shiftId,
        parsed.data.paymentMethod,
        requestedAmount,
        instFilter
      );

      const paymentId = `pay_counter_${Date.now()}`;
      const paymentNumber = `RCPT-CASH-${Date.now().toString().slice(-6)}`;

      const payment = await store.recordPayment({
        id: paymentId,
        paymentNumber,
        institutionId: allocation.institutionId,
        allocationId: allocation.id,
        studentId: allocation.studentId,
        amount: requestedAmount,
        fineAmount: 0,
        discountAmount: 0,
        netAmount: requestedAmount,
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

      // Reduce allocation/installment balances for the collected amount.
      // Idempotent inside the store (ledger marker per payment).
      await store.applyPaymentToAllocation(payment);

      return NextResponse.json({ success: true, payment, register: updatedShift }, { status: 201 });
    }

    if (action === 'close') {
      const parsed = closeCounterRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }
      const instFilter =
        session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;

      const summary = await engine.closeShift(
        parsed.data.shiftId,
        parsed.data.closingCashDeclared,
        session.staffId || (session as any).userId || 'staff',
        parsed.data.supervisorNotes,
        instFilter
      );

      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: 'Invalid counter action' }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Fees Counter Error]:", err instanceof Error ? err.stack : err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not active or open')) {
      return NextResponse.json({ error: 'Counter shift not found or already closed' }, { status: 404 });
    }
    if (msg.includes('exceeds current cash in drawer')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes('already has an active open shift')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: "Counter operation failed" }, { status: 500 });
  }
}, 'finance:fees:collect');
