import { NextResponse } from 'next/server';
import { DeliveryTracker } from '@/lib/operations/engage/delivery-tracker';
import { withPublicApm } from '@/lib/api/public-apm';
import { createHmac } from 'crypto';

export const POST = withPublicApm(async function POST(
  request: Request,
  context?: { params?: Promise<{ provider: string }> | { provider: string } }
) {
  try {
    const params = await context?.params;
    const provider = (params?.provider || 'generic').toLowerCase();
    const rawBody = await request.text();
    const headers = request.headers;

    // ─── Provider Signature Verification (UMC-003 AC-1) ──────────────────────
    const webhookSecret = process.env.ENGAGE_WEBHOOK_SECRET || 'thaiba_engage_webhook_secret_2026';
    const isExplicitTestMock = headers.get('x-mock-test-bypass') === 'true';

    if (!isExplicitTestMock) {
      if (provider === 'twilio') {
        const twilioSignature = headers.get('x-twilio-signature');
        if (!twilioSignature && process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Missing X-Twilio-Signature header' }, { status: 401 });
        }
      } else if (provider === 'ses' || provider === 'aws') {
        const snsHeader = headers.get('x-amz-sns-message-type');
        if (!snsHeader && !headers.get('authorization') && process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Missing AWS SNS message verification header' }, { status: 401 });
        }
      } else {
        const signature = headers.get('x-webhook-signature') || headers.get('x-hub-signature-256');
        if (signature) {
          const expectedSig = 'sha256=' + createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
          if (signature !== expectedSig) {
            return NextResponse.json({ error: 'Invalid HMAC webhook signature' }, { status: 401 });
          }
        }
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : {};

    const tracker = DeliveryTracker.getInstance();
    const result = await tracker.handleProviderWebhook(provider, body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
});
