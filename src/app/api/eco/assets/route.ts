import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EcoDbStore } from '@/lib/db/eco-store';
import { energyAssetCreateSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const facilityId = searchParams.get('facilityId') || undefined;

  const store = EcoDbStore.getInstance();
  const assets = await store.listEnergyAssets(tenantId, facilityId);
  return NextResponse.json({ assets });
}, 'eco:carbon:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = energyAssetCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const store = EcoDbStore.getInstance();
    const asset = await store.createEnergyAsset({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:assets:manage');
