import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { PolicyEngine } from '@/lib/security/segmentation/policy-engine';
import { PolicyPropagationMesh } from '@/lib/security/segmentation/policy-propagation-mesh';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';

export const GET = withDPoP(
  requireAuth(async (_req: Request, _session, context) => {
    const params = await context?.params;
    const policyId = params?.id || '';
    const policy = PolicyEngine.getInstance().getPolicy(policyId);
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  }, 'system:security:view'),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (_req: Request, _session, context) => {
    const params = await context?.params;
    const policyId = params?.id || '';
    const policy = PolicyEngine.getInstance().getPolicy(policyId);
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    PolicyPropagationMesh.getInstance().broadcastPolicyRemoval(policyId);
    await ZasmDbStore.deletePolicy(policyId);

    return NextResponse.json({ success: true, message: `Policy ${policyId} deleted` });
  }, 'system:security:manage'),
  { required: false }
);
