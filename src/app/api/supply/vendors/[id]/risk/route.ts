import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { VendorRiskScreeningEngine } from '@/lib/operations/supply/risk/vendor-risk-screening-engine';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const riskEngine = VendorRiskScreeningEngine.getInstance();

export const POST = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  try {
    const institutionId = user?.institutionId || 'global';
    const vendor = await store.getVendorById(id, institutionId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const riskAssessment = riskEngine.screenVendor(
      {
        vendorId: id,
        vendorName: vendor.name,
        taxId: vendor.taxId,
        country: vendor.country,
        yearsInBusiness: body.yearsInBusiness || 5,
        creditScore: body.creditScore || 750,
        priorDiscrepancyRate: body.priorDiscrepancyRate || 0.0,
        activeLawsuitsCount: body.activeLawsuitsCount || 0,
        certificationsCount: body.certificationsCount || 1,
      },
      institutionId
    );

    await store.createRiskAssessment(riskAssessment);
    return NextResponse.json({ riskAssessment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:vendors:manage');
