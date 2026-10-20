import { NextResponse } from 'next/server';
import { DeliveryTracker } from '@/lib/operations/engage/delivery-tracker';
import { withPublicApm } from '@/lib/api/public-apm';
import { createHmac, timingSafeEqual } from 'crypto';

function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const POST = withPublicApm(async function POST(
  request: Request,
  ...rest: unknown[]
) {
  try {
    const context = rest[0] as { params?: Promise<{ provider: string }> | { provider: string } } | undefined;
    const params = await context?.params;
    const provider = (params?.provider || 'generic').toLowerCase();
    const rawBody = await request.text();
    const headers = request.headers;

    // ─── Provider Signature Verification (UMC-003 AC-1) ──────────────────────
    const webhookSecret = process.env.ENGAGE_WEBHOOK_SECRET;
    const isExplicitTestMock =
      process.env.NODE_ENV === 'test' && headers.get('x-mock-test-bypass') === 'true';

    if (!isExplicitTestMock) {
      if (provider === 'twilio') {
        const twilioSignature = headers.get('x-twilio-signature');
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || webhookSecret;
        if (!twilioSignature || !twilioAuthToken) {
          return NextResponse.json({ error: 'Missing X-Twilio-Signature header or secret' }, { status: 401 });
        }
        const expectedHmac = createHmac('sha256', twilioAuthToken).update(rawBody).digest('hex');
        const expectedBase64 = createHmac('sha1', twilioAuthToken).update(rawBody).digest('base64');
        if (!safeCompareStrings(twilioSignature, expectedHmac) && !safeCompareStrings(twilioSignature, expectedBase64)) {
          return NextResponse.json({ error: 'Invalid X-Twilio-Signature header' }, { status: 401 });
        }
      } else if (provider === 'ses' || provider === 'aws') {
        const snsHeader = headers.get('x-amz-sns-message-type');
        const signature = headers.get('x-webhook-signature') || headers.get('authorization');
        if (!snsHeader || !signature || !webhookSecret) {
          return NextResponse.json({ error: 'Missing AWS SNS message verification header or secret' }, { status: 401 });
        }
        const expectedSig = 'sha256=' + createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        const rawExpected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        if (!safeCompareStrings(signature, expectedSig) && !safeCompareStrings(signature, rawExpected)) {
          return NextResponse.json({ error: 'Invalid AWS SNS webhook signature' }, { status: 401 });
        }
      } else {
        const signature = headers.get('x-webhook-signature') || headers.get('x-hub-signature-256');
        if (!webhookSecret) {
          return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 401 });
        }
        if (!signature) {
          return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 401 });
        }
        const expectedSig = 'sha256=' + createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        const rawExpected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        if (!safeCompareStrings(signature, expectedSig) && !safeCompareStrings(signature, rawExpected)) {
          return NextResponse.json({ error: 'Invalid HMAC webhook signature' }, { status: 401 });
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
