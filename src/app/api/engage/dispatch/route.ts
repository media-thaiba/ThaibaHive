import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageDispatchSchema } from '@/lib/validation/engage-schemas';
import { DispatchEngine } from '@/lib/operations/engage/dispatch-engine';
import { ConsentManager } from '@/lib/operations/engage/privacy/consent-manager';
import { EngageTelemetry } from '@/lib/operations/engage/engage-telemetry';

const dispatchEngine = DispatchEngine.getInstance();
const consentManager = ConsentManager.getInstance();
const telemetry = EngageTelemetry.getInstance();

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engageDispatchSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const payload = parse.data;

    // Check GDPR/FERPA consent gate
    const consent = await consentManager.validateDispatchConsent(
      payload.recipientId,
      payload.channel,
      'general',
      payload.priority,
      'global'
    );

    if (!consent.hasConsent) {
      return NextResponse.json({
        error: 'Consent verification failed',
        reason: consent.reason,
      }, { status: 403 });
    }

    const result = await dispatchEngine.dispatchMessage({
      messageId: payload.messageId,
      campaignId: payload.campaignId,
      templateId: payload.templateId,
      recipientId: payload.recipientId,
      recipientType: payload.recipientType,
      recipientChannelAddress: payload.recipientChannelAddress,
      channel: payload.channel,
      priority: payload.priority,
      subject: payload.subject,
      body: payload.body,
      personalizedData: payload.personalizedData,
      institutionId: 'global',
    });

    telemetry.recordDispatch(payload.channel, payload.priority);
    if (!result.success) {
      telemetry.recordFailure(payload.channel, result.provider);
    } else {
      telemetry.recordCost(result.costUsd);
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Dispatch failed' }, { status: 500 });
  }
}, 'engage:campaign:manage');
