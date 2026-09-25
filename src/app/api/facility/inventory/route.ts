import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { partsInventoryManager } from '@/lib/operations/facility/inventory/parts-inventory-manager';
import { ReorderAllocator } from '@/lib/operations/facility/inventory/reorder-allocator';
import { partsReservationSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const checkReorder = searchParams.get('checkReorder') === 'true';

  if (checkReorder) {
    const requisitions = await ReorderAllocator.scanAndGenerateRequisitions(tenantId);
    return NextResponse.json({ requisitions });
  }

  const parts = await facilityStore.listParts(tenantId);
  return NextResponse.json({ parts });
}, 'facility:inventory:manage');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = partsReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid reservation payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const reservationRes = await partsInventoryManager.reserveParts(parsed.data.requests, tenantId);

    return NextResponse.json({ ...reservationRes }, { status: reservationRes.allReserved ? 200 : 409 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:inventory:manage');
