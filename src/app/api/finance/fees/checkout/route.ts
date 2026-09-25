import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { GatewayAdapterFactory } from '@/lib/operations/finance/gateways/gateway-adapter-factory';
import { createCheckoutOrderSchema } from '@/lib/validation/fee-schemas';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createCheckoutOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const allocation = await store.getAllocationById(parsed.data.allocationId);
    if (!allocation) {
      return NextResponse.json({ error: 'Fee allocation not found' }, { status: 404 });
    }

    const factory = GatewayAdapterFactory.getInstance();
    const adapter = factory.getAdapter(parsed.data.paymentMethod);

    const receiptNumber = `RCPT-${Date.now().toString().slice(-6)}`;
    const order = await adapter.createOrder({
      orderId: `ord_${Date.now()}`,
      amount: parsed.data.amount,
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
      amount: parsed.data.amount,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: parsed.data.amount,
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to initiate checkout order' }, { status: 500 });
  }
}, 'finance:fees:view');
