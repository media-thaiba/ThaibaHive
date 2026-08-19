import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { PolicyEngine } from '@/lib/security/segmentation/policy-engine';
import { PolicyPropagationMesh } from '@/lib/security/segmentation/policy-propagation-mesh';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';
import { segmentationPolicySchema } from '@/lib/validation/zasm-schemas';
import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';

export const GET = withDPoP(
  requireAuth(async () => {
    const policies = PolicyEngine.getInstance().listPolicies();
    return NextResponse.json({ policies });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    try {
      const body = await req.json();
      const parsed = segmentationPolicySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const policy = parsed.data as any;
      PolicyPropagationMesh.getInstance().broadcastPolicyUpdate(policy);
      await ZasmDbStore.savePolicy(policy);
      await ZasmAuditLogger.logPolicyApplied(policy);

      return NextResponse.json({ success: true, policy }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:manage'),
  { required: false }
);
