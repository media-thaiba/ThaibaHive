import { NextResponse } from 'next/server';
import { withPublicApm } from '@/lib/api/public-apm';
import { WebhookProcessor } from '@/lib/operations/finance/gateways/webhook-processor';
import { PaymentMethod } from '@/lib/operations/finance/types';

export const POST = withPublicApm(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const gateway = (url.searchParams.get('gateway') || 'razorpay') as PaymentMethod;

    const signature =
      request.headers.get('x-razorpay-signature') ||
      request.headers.get('stripe-signature') ||
      request.headers.get('x-upi-signature') ||
      request.headers.get('authorization') ||
      '';

    const rawBody = await request.text();
    const processor = WebhookProcessor.getInstance();

    const result = await processor.handleWebhook(gateway, rawBody, signature);

    if (!result.success && result.error === 'INVALID_SIGNATURE') {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
});
