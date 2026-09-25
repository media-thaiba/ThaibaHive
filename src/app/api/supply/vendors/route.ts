import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { vendorCreateSchema } from '@/lib/validation/supply-schemas';
import { VendorRiskScreeningEngine } from '@/lib/operations/supply/risk/vendor-risk-screening-engine';
import { EsgScoringEngine } from '@/lib/operations/supply/esg/esg-scoring-engine';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const riskEngine = VendorRiskScreeningEngine.getInstance();
const esgEngine = EsgScoringEngine.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const vendors = await store.listVendors(institutionId);
  return NextResponse.json({ vendors });
}, 'supply:vendors:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = vendorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid vendor payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const vendorId = `ven-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Initial Risk Screening
    const riskAssessment = riskEngine.screenVendor(
      {
        vendorId,
        vendorName: parsed.data.name,
        taxId: parsed.data.taxId,
        country: parsed.data.country,
        yearsInBusiness: 5,
        creditScore: 750,
        priorDiscrepancyRate: 0.0,
        activeLawsuitsCount: 0,
        certificationsCount: 1,
      },
      institutionId
    );
    await store.createRiskAssessment(riskAssessment);

    // Initial ESG score
    const esgScore = esgEngine.evaluateEsgScore(
      {
        vendorId,
        hasIso14001: true,
        hasRenewableEnergyCommitment: true,
        recycledPackagingPercent: 50,
        hasFairLaborCert: true,
        diversityOwnershipCertified: false,
        hasAntiBriberyPolicy: true,
        hasTransparentAuditedFinances: true,
        scope3CarbonIntensityKgPerUsd: 0.12,
      },
      institutionId
    );
    await store.createEsgScore(esgScore);

    const vendor = {
      id: vendorId,
      vendorCode: parsed.data.vendorCode,
      name: parsed.data.name,
      legalEntityName: parsed.data.legalEntityName,
      category: parsed.data.category,
      taxId: parsed.data.taxId,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
      address: parsed.data.address,
      city: parsed.data.city,
      country: parsed.data.country,
      paymentTerms: parsed.data.paymentTerms,
      onboardingStatus: riskAssessment.recommendedAction === 'reject' ? ('blocked' as const) : ('approved' as const),
      riskTier: riskAssessment.overallRiskScore >= 70 ? ('high' as const) : riskAssessment.overallRiskScore >= 35 ? ('medium' as const) : ('low' as const),
      riskScore: riskAssessment.overallRiskScore,
      esgRating: esgScore.ratingGrade,
      esgScore: esgScore.compositeEsgScore,
      isSanctionsClean: !riskAssessment.sanctionsMatched,
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await store.createVendor(vendor);
    return NextResponse.json({ vendor: created, riskAssessment, esgScore }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:vendors:manage');
