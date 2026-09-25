import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { orderApprovalSchema } from '@/lib/validation/supply-schemas';
import { SupplyMerkleAnchor } from '@/lib/operations/supply/security/supply-merkle-anchor';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const merkleAnchor = new SupplyMerkleAnchor(store);

export const POST = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  try {
    const body = await req.json();
    const parsed = orderApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid approval payload' }, { status: 400 });
    }

    const institutionId = user?.institutionId || 'global';
    const order = await store.getPurchaseOrderById(id, institutionId);
    if (!order) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const nextStatus = parsed.data.action === 'approve' ? 'acknowledged' : 'cancelled';
    const updated = await store.updatePurchaseOrderStatus(id, nextStatus, institutionId);

    // Merkle Anchor
    await merkleAnchor.anchorEvent(
      user?.id || 'approver',
      user?.role || 'admin',
      parsed.data.action === 'approve' ? 'requisition_approved' : 'order_rejected',
      'purchase_order',
      id,
      { action: parsed.data.action, comments: parsed.data.comments },
      institutionId
    );

    return NextResponse.json({ order: updated, action: parsed.data.action });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:orders:approve');
