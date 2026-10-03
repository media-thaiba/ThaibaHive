import { NextResponse } from 'next/server';
import { DialogManager } from '@/lib/operations/engage/conversational/dialog-manager';
import { withPublicApm } from '@/lib/api/public-apm';
import crypto from 'crypto';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validateTwilioSignature(
  authToken: string,
  twilioSignature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!twilioSignature) return false;
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  if (expectedSignature.length !== twilioSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(twilioSignature, 'utf-8')
  );
}

export const POST = withPublicApm(async function POST(request: Request) {
  try {
    const twilioSignature = request.headers.get('x-twilio-signature');
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    let speechResult = '';
    let fromNumber = 'caller';
    const params: Record<string, string> = {};

    const formData = typeof request.formData === 'function' ? await request.formData().catch(() => null) : null;

    if (formData) {
      formData.forEach((value, key) => {
        params[key] = String(value);
      });
      speechResult = (formData.get('SpeechResult') as string) || '';
      fromNumber = (formData.get('From') as string) || 'caller';
    } else {
      const json = typeof request.json === 'function' ? await request.json().catch(() => ({})) : {};
      if (json && typeof json === 'object') {
        Object.entries(json).forEach(([k, v]) => {
          params[k] = String(v);
        });
        speechResult = json.SpeechResult || json.text || '';
        fromNumber = json.From || 'caller';
      }
    }

    if (twilioAuthToken) {
      let targetUrl = request.url;
      const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (configuredOrigin) {
        try {
          const reqUrl = new URL(request.url);
          const origUrl = new URL(configuredOrigin);
          origUrl.pathname = reqUrl.pathname;
          origUrl.search = reqUrl.search;
          targetUrl = origUrl.toString();
        } catch {
          targetUrl = request.url;
        }
      }
      const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, targetUrl, params);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid or missing Twilio signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Twilio auth token not configured' }, { status: 401 });
    }

    // Hash caller ID to generate deterministic, unforgeable session ID
    const sanitizedFrom = fromNumber.replace(/[^a-zA-Z0-9_+]/g, '');
    const callerHash = crypto.createHash('sha256').update(sanitizedFrom).digest('hex').substring(0, 16);
    const sessionId = `voice_sesh_${callerHash}`;

    let botResponse = 'Welcome to Thaiba Higher Education Group voice assistant. How can I help you today?';

    if (speechResult) {
      try {
        const dialogManager = DialogManager.getInstance();
        const turn = await dialogManager.processUserMessage(sessionId, sanitizedFrom, speechResult, 'global');
        botResponse = turn.botReplyText;
      } catch {
        botResponse = speechResult;
      }
    }

    const safeBotResponse = escapeXml(botResponse);

    // TwiML Response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${safeBotResponse}</Say>
  <Gather input="speech" timeout="4" action="/api/engage/voice" method="POST">
    <Say>Please speak your question, or stay on the line to connect with an advisor.</Say>
  </Gather>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[Voice Webhook] Processing error:', error);
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Our lines are currently busy. Please visit our online portal.</Say>
</Response>`;
    return new NextResponse(fallbackTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
