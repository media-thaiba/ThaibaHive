import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';

export const GET = withDPoP(
  requireAuth(async () => {
    const vulnerabilities = await ZasmDbStore.listVulnerabilities();
    return NextResponse.json({ vulnerabilities });
  }, 'system:security:view'),
  { required: false }
);
