import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { purchaseOrderCreateSchema } from '@/lib/validation/supply-schemas';
import { BudgetEncumbranceEngine } from '@/lib/operations/supply/finance/budget-encumbrance-engine';
import { SupplyMerkleAnchor } from '@/lib/operations/supply/security/supply-merkle-anchor';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const encumbranceEngine = BudgetEncumbranceEngine.getInstance();
const merkleAnchor = new SupplyMerkleAnchor(store);

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const orders = await store.listPurchaseOrders(institutionId);
  return NextResponse.json({ orders });
}, 'supply:orders:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = purchaseOrderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid purchase order payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    // 1. Lock Encumbrance
    const { encumbrance } = encumbranceEngine.lockEncumbrance(
      poId,
      parsed.data.departmentId,
      'BUDGET-DEPT',
      parsed.data.totalAmountUsd,
      institutionId
    );
    await store.createEncumbrance(encumbrance);

    // 2. Create PO
    const po = {
      id: poId,
      poNumber,
      requisitionId: parsed.data.requisitionId,
      vendorId: parsed.data.vendorId,
      departmentId: parsed.data.departmentId,
      orderDate: parsed.data.orderDate,
      expectedDeliveryDate: parsed.data.expectedDeliveryDate,
      subtotalUsd: parsed.data.subtotalUsd,
      taxAmountUsd: parsed.data.taxAmountUsd,
      shippingAmountUsd: parsed.data.shippingAmountUsd,
      totalAmountUsd: parsed.data.totalAmountUsd,
      currency: parsed.data.currency,
      paymentTerms: parsed.data.paymentTerms,
      shippingAddress: parsed.data.shippingAddress,
      shippingDock: parsed.data.shippingDock,
      status: 'issued' as const,
      isEncumbered: true,
      encumbranceId: encumbrance.id,
      merkleLeafHash: SupplyMerkleAnchor.computeSha256({ poId, poNumber, total: parsed.data.totalAmountUsd }),
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdPo = await store.createPurchaseOrder(po);

    // 3. Create Line Items if provided
    if (parsed.data.lineItems && parsed.data.lineItems.length > 0) {
      for (let i = 0; i < parsed.data.lineItems.length; i++) {
        const item = parsed.data.lineItems[i];
        await store.createLineItem({
          id: `line-${poId}-${i + 1}`,
          poId,
          lineNumber: i + 1,
          itemSku: item.itemSku,
          description: item.description,
          category: item.category,
          unitPriceUsd: item.unitPriceUsd,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: 0,
          quantityInvoiced: 0,
          unitOfMeasure: item.unitOfMeasure,
          lineTotalUsd: item.unitPriceUsd * item.quantityOrdered,
          status: 'pending',
          institutionId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Merkle Audit Anchor
    await merkleAnchor.anchorEvent(
      user?.id || 'system-buyer',
      user?.role || 'admin',
      'po_issued',
      'purchase_order',
      poId,
      { poNumber, total: parsed.data.totalAmountUsd },
      institutionId
    );

    return NextResponse.json({ purchaseOrder: createdPo, encumbrance }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:orders:manage');
