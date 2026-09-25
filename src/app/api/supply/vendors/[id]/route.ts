import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();

export const GET = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';

  const vendor = await store.getVendorById(id, institutionId);
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const riskAssessment = await store.getRiskAssessmentByVendor(id, institutionId);
  const esgScore = await store.getEsgScoreByVendor(id, institutionId);
  const certifications = await store.listCertificationsByVendor(id, institutionId);

  return NextResponse.json({
    vendor,
    riskAssessment,
    esgScore,
    certifications,
  });
}, 'supply:vendors:view');
