import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { FeeDbStore } from '@/db/fee-store';
import { GatewayAdapterFactory } from '@/lib/operations/finance/gateways/gateway-adapter-factory';
import { createCheckoutOrderSchema } from '@/lib/validation/fee-schemas';

export const dynamic = 'force-dynamic';

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
    const parsed = createCheckoutOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const instFilter = session.institutionId && session.institutionId !== 'global' ? session.institutionId : undefined;
    const allocation = await store.getAllocationById(parsed.data.allocationId, instFilter);
    if (!allocation) {
      return NextResponse.json({ error: 'Fee allocation not found' }, { status: 404 });
    }

    // Server-side amount guard: the client amount is never allowed to exceed
    // the outstanding balance it is being collected against.
    const requestedAmount = Number(parsed.data.amount.toFixed(2));
    let maxAmount = allocation.balanceAmount;
    if (parsed.data.installmentId) {
      const installment = allocation.installments?.find((i) => i.id === parsed.data.installmentId);
      if (!installment) {
        return NextResponse.json({ error: 'Fee installment not found for this allocation' }, { status: 404 });
      }
      maxAmount = installment.balanceAmount;
    }
    if (maxAmount <= 0) {
      return NextResponse.json({ error: 'No outstanding balance to collect' }, { status: 409 });
    }
    if (requestedAmount > maxAmount) {
      return NextResponse.json(
        { error: `Amount exceeds outstanding balance of ₹${maxAmount.toFixed(2)}` },
        { status: 400 }
      );
    }

    const factory = GatewayAdapterFactory.getInstance();
    const adapter = factory.getAdapter(parsed.data.paymentMethod);

    const receiptNumber = `RCPT-${Date.now().toString().slice(-6)}`;
    const order = await adapter.createOrder({
      orderId: `ord_${Date.now()}`,
      amount: requestedAmount,
      currency: parsed.data.currency,
      receiptNumber,
      customerName: parsed.data.customerName || (session as any).userId || session.staffId || 'Customer',
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      notes: {
        allocationId: allocation.id,
        studentId: allocation.studentId,
        installmentId: parsed.data.installmentId || '',
      },
    });

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payment = await store.recordPayment({
      id: paymentId,
      paymentNumber: `PAY-${Date.now().toString().slice(-8)}`,
      institutionId: allocation.institutionId,
      allocationId: allocation.id,
      studentId: allocation.studentId,
      amount: requestedAmount,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: requestedAmount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: 'initiated',
      gatewayOrderId: order.gatewayOrderId,
      payerName: parsed.data.customerName,
      payerEmail: parsed.data.customerEmail,
      payerPhone: parsed.data.customerPhone,
      receiptNumber,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      payment,
      order,
    });
  } catch (err: unknown) {
    console.error("[Fees Checkout Error]:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Failed to initiate checkout order" }, { status: 500 });
  }
}, 'finance:fees:view');
