import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { equipmentCreateSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const category = (searchParams.get('category') as any) || undefined;

  const equipment = await facilityStore.listEquipment(tenantId, category);
  return NextResponse.json({ equipment });
}, 'facility:equipment:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = equipmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid equipment payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const equipment = await facilityStore.createEquipment({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ equipment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:equipment:manage');
