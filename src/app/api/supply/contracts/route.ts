import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { contractCreateSchema } from '@/lib/validation/supply-schemas';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const contracts = await store.listContracts(institutionId);
  return NextResponse.json({ contracts });
}, 'supply:contracts:manage');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = contractCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid contract payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const contractId = `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const contract = {
      id: contractId,
      contractCode: parsed.data.contractCode,
      vendorId: parsed.data.vendorId,
      title: parsed.data.title,
      contractType: parsed.data.contractType,
      totalValueUsd: parsed.data.totalValueUsd,
      effectiveStartDate: parsed.data.effectiveStartDate,
      effectiveEndDate: parsed.data.effectiveEndDate,
      renewalNoticeDays: parsed.data.renewalNoticeDays,
      slaUptimeTargetPercent: parsed.data.slaUptimeTargetPercent,
      slaPenaltyRatePerOutageHourUsd: parsed.data.slaPenaltyRatePerOutageHourUsd,
      status: 'active' as const,
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await store.createContract(contract);
    return NextResponse.json({ contract: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:contracts:manage');
