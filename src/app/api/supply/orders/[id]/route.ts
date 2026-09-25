import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();

export const GET = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';

  const order = await store.getPurchaseOrderById(id, institutionId);
  if (!order) {
    return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
  }

  const lineItems = await store.listLineItemsByPo(id, institutionId);
  const goodsReceipts = await store.listGoodsReceiptsByPo(id, institutionId);
  const encumbrance = await store.getEncumbranceByPoId(id, institutionId);

  return NextResponse.json({
    order,
    lineItems,
    goodsReceipts,
    encumbrance,
  });
}, 'supply:orders:view');
