import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';
import { TrustOverrideManager } from '@/lib/security/trust/trust-override-manager';

export const GET = withDPoP(
  requireAuth(async () => {
    const devices = await ZasmDbStore.listDeviceTrusts();
    const activeOverrides = TrustOverrideManager.getInstance().listActiveOverrides();
    return NextResponse.json({ devices, activeOverrides });
  }, 'system:security:view'),
  { required: false }
);
