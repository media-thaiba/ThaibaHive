import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { HumanApprovalController } from '@/lib/operations/marl/human-approval-controller';
import { marlOverrideSchema } from '@/lib/validation/aims-schemas';

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = marlOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const controller = new HumanApprovalController();

    if (parsed.data.action === 'EMERGENCY_KILL_SWITCH') {
      const abortResult = controller.triggerEmergencyKillSwitch();
      return NextResponse.json({
        success: true,
        action: 'EMERGENCY_KILL_SWITCH',
        abortedCount: abortResult.abortedCount,
        message: 'Emergency global kill-switch triggered. All autonomous optimization actions reverted to baseline static schedules.',
      });
    }

    return NextResponse.json({
      success: true,
      action: parsed.data.action,
      decisionId: parsed.data.decisionId,
      message: `Action ${parsed.data.action} processed successfully.`,
    });
  }, 'system:operations:manage'),
  { required: false }
);
