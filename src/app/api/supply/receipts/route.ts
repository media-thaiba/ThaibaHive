import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { goodsReceiptCreateSchema } from '@/lib/validation/supply-schemas';
import { SupplyMerkleAnchor } from '@/lib/operations/supply/security/supply-merkle-anchor';
import { SupplyStreamManager } from '@/lib/operations/supply/streaming/supply-stream-manager';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const merkleAnchor = new SupplyMerkleAnchor(store);
const streamManager = SupplyStreamManager.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const receipts = await store.listGoodsReceipts(institutionId);
  return NextResponse.json({ receipts });
}, 'supply:receipts:record');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = goodsReceiptCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid goods receipt payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const receiptId = `grn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;

    const grn = {
      id: receiptId,
      receiptNumber,
      poId: parsed.data.poId,
      vendorId: parsed.data.vendorId,
      receivedDate: parsed.data.receivedDate,
      receivedByUserId: user?.id || 'receiving-clerk',
      warehouseBay: parsed.data.warehouseBay,
      dockTag: parsed.data.dockTag,
      carrierName: parsed.data.carrierName,
      trackingNumber: parsed.data.trackingNumber,
      packageCondition: parsed.data.packageCondition,
      inspectionNotes: parsed.data.inspectionNotes,
      receiverSignature: `VERIFIED_${user?.name || 'RECEIVER'}`,
      status: parsed.data.packageCondition === 'damaged' ? ('quarantined' as const) : ('verified' as const),
      institutionId,
      createdAt: new Date().toISOString(),
    };

    const saved = await store.createGoodsReceipt(grn);

    // Broadcast receiving dock event
    streamManager.broadcast({
      topic: 'receiving:dock',
      event: 'goods_received',
      data: { receiptNumber, poId: parsed.data.poId, status: grn.status },
      timestamp: new Date().toISOString(),
      institutionId,
    });

    // Merkle Anchor
    await merkleAnchor.anchorEvent(
      user?.id || 'dock-staff',
      user?.role || 'staff',
      'goods_received',
      'goods_receipt',
      receiptId,
      { receiptNumber, poId: parsed.data.poId },
      institutionId
    );

    return NextResponse.json({ goodsReceipt: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:receipts:record');
