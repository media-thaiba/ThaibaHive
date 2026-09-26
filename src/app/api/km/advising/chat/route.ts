import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmAdvisingChatSchema } from '@/lib/validation/km-schemas';
import { agentOrchestrator } from '@/lib/operations/km/conversational/agent-orchestrator';
import { academicPrivacyShield } from '@/lib/operations/km/governance/academic-privacy-shield';
import { cloudTranslationAdapter } from '@/lib/operations/km/localization/cloud-translation-adapter';
import { kmAnalyticsAggregator } from '@/lib/operations/km/analytics/km-analytics-aggregator';
import { kmTelemetry } from '@/lib/operations/km/km-telemetry';

export const POST = requireAuth(async (request: Request, _user: any) => {
  try {
    const body = await request.json();
    const parse = kmAdvisingChatSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { sessionId, studentId, prompt, targetLanguage, institutionId } = parse.data;
    const start = Date.now();

    // Redact PII before processing
    const redacted = academicPrivacyShield.redactStudentPii(prompt);

    const response = await agentOrchestrator.handleUserMessage({
      sessionId,
      studentId,
      prompt: redacted.sanitizedText,
      targetLanguage,
      institutionId,
    });

    // Translate if non-English target language requested
    if (targetLanguage && targetLanguage !== 'en') {
      const transRes = await cloudTranslationAdapter.translateCloud(response.answerText, targetLanguage, 'en');
      response.translatedAnswerText = transRes.translatedText;
    }

    const durationMs = Date.now() - start;
    kmAnalyticsAggregator.recordQueryEvent({
      topic: 'Copilot Advising Chat',
      intent: 'copilot_conversation',
      wasResolvedAutonomously: true,
      responseTimeMs: durationMs,
      tokensConsumed: 150,
      institutionId,
    });

    kmTelemetry.trackQuery('copilot_chat', 'success', durationMs / 1000, institutionId);

    return NextResponse.json({ success: true, response }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Copilot chat execution failed' }, { status: 500 });
  }
}, 'km:knowledge:search');
