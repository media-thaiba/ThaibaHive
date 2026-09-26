import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { assetCreateSchema } from '@/lib/validation/twin-schemas';
import { TwinDbStore } from '@/lib/db/twin-store';
import { SpatialPrivacyShield } from '@/lib/operations/twin/security/spatial-privacy-shield';

const store = TwinDbStore.getInstance();

export const GET = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const facilityId = searchParams.get('facilityId') || undefined;

    const assets = await store.listAssets(tenantId, facilityId);
    const userRole = user?.role || 'student';

    const sanitized = assets.map((a) => {
      let coords = { x: 0, y: 0, z: 0 };
      try { coords = JSON.parse(a.currentCoordinatesJson); } catch {}
      const masked = SpatialPrivacyShield.maskAssetCoordinates(coords, userRole);
      return {
        ...a,
        currentCoordinatesJson: JSON.stringify(masked),
      };
    });

    return NextResponse.json({ success: true, assets: sanitized }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list assets' }, { status: 500 });
  }
}, 'twin:facilities:read');

export const POST = requireAuth(async (request: Request, _user: any) => {
  try {
    const body = await request.json();
    const parse = assetCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const asset = await store.createAsset(parse.data);
    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register asset' }, { status: 500 });
  }
}, 'twin:assets:manage');
