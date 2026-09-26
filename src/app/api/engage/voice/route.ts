import { NextResponse } from 'next/server';
import { DialogManager } from '@/lib/operations/engage/conversational/dialog-manager';
import { withPublicApm } from '@/lib/api/public-apm';

export const POST = withPublicApm(async function POST(request: Request) {
  try {
    const formData = await request.formData().catch(() => null);
    let speechResult = '';
    let fromNumber = 'caller';

    if (formData) {
      speechResult = (formData.get('SpeechResult') as string) || '';
      fromNumber = (formData.get('From') as string) || 'caller';
    } else {
      const json = await request.json().catch(() => ({}));
      speechResult = json.SpeechResult || json.text || '';
      fromNumber = json.From || 'caller';
    }

    const sessionId = `voice_sesh_${fromNumber.replace(/\+/g, '')}`;
    const dialogManager = DialogManager.getInstance();

    let botResponse = 'Welcome to Thaiba Higher Education Group voice assistant. How can I help you today?';

    if (speechResult) {
      const turn = await dialogManager.processUserMessage(sessionId, fromNumber, speechResult, 'global');
      botResponse = turn.botReplyText;
    }

    // TwiML Response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${botResponse}</Say>
  <Gather input="speech" timeout="4" action="/api/engage/voice" method="POST">
    <Say>Please speak your question, or stay on the line to connect with an advisor.</Say>
  </Gather>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch {
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
