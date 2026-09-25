import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { EsgScoringEngine } from '@/lib/operations/supply/esg/esg-scoring-engine';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const esgEngine = EsgScoringEngine.getInstance();

export const POST = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  try {
    const institutionId = user?.institutionId || 'global';
    const vendor = await store.getVendorById(id, institutionId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const esgScore = esgEngine.evaluateEsgScore(
      {
        vendorId: id,
        hasIso14001: body.hasIso14001 ?? true,
        hasRenewableEnergyCommitment: body.hasRenewableEnergyCommitment ?? true,
        recycledPackagingPercent: body.recycledPackagingPercent ?? 50,
        hasFairLaborCert: body.hasFairLaborCert ?? true,
        diversityOwnershipCertified: body.diversityOwnershipCertified ?? false,
        hasAntiBriberyPolicy: body.hasAntiBriberyPolicy ?? true,
        hasTransparentAuditedFinances: body.hasTransparentAuditedFinances ?? true,
        scope3CarbonIntensityKgPerUsd: body.scope3CarbonIntensityKgPerUsd ?? 0.12,
      },
      institutionId
    );

    await store.createEsgScore(esgScore);
    return NextResponse.json({ esgScore });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:vendors:manage');
