/**
 * Admin Chaos Emergency Kill-Switch Abort Endpoint
 * Sprint-042 (ARES) — ARES-020
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ChaosKillSwitch } from '@/lib/security/chaos/kill-switch';
import { AresAuditLogger } from '@/lib/security/ares/ares-audit-events';
import { chaosKillSwitchTriggerSchema } from '@/lib/validation/ares-schemas';

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = chaosKillSwitchTriggerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const killSwitch = ChaosKillSwitch.getInstance();
    const event = await killSwitch.trip(parsed.data.reason, 'ADMIN_MANUAL_API');

    await AresAuditLogger.logEvent('CHAOS_EMERGENCY_ABORT', 'chaos-kill-switch', {
      reason: parsed.data.reason,
      revertedCount: event.revertedInjectorsCount,
      durationMs: event.durationMs,
    });

    return NextResponse.json({
      success: true,
      event,
    });
  }, 'system:security:chaos'),
  { required: false }
);
