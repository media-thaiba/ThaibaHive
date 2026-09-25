import { SupplyDbStore } from '../../db/supply-store';
import {
  SupplyVendorItem,
  SupplyPurchaseRequisitionItem,
  SupplyPurchaseOrderItem,
  SupplyGoodsReceiptItem,
  SupplyVendorInvoiceItem,
  SupplyThreeWayMatchItem,
  SupplyContractItem,
  SupplyBudgetEncumbranceItem,
} from '../../operations/supply/supply-types';

describe('SupplyDbStore (SUPPLY-002)', () => {
  let store: SupplyDbStore;

  beforeEach(() => {
    store = SupplyDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve a vendor with multi-tenant isolation', async () => {
    const vendor: SupplyVendorItem = {
      id: 'ven-1',
      vendorCode: 'VEND-001',
      name: 'Apex Scientific & Hardware Corp',
      legalEntityName: 'Apex Scientific Inc.',
      category: 'hardware',
      taxId: 'XX-1234567',
      contactName: 'Jane Smith',
      contactEmail: 'jane@apexsci.com',
      contactPhone: '+1-555-0199',
      address: '100 Silicon Way',
      city: 'Boston',
      country: 'USA',
      paymentTerms: 'NET_30',
      onboardingStatus: 'approved',
      riskTier: 'low',
      riskScore: 12.5,
      esgRating: 'AAA',
      esgScore: 92.0,
      isSanctionsClean: true,
      institutionId: 'inst-test-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createVendor(vendor);
    const retrieved = await store.getVendorById('ven-1', 'inst-test-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.vendorCode).toBe('VEND-001');

    // Check multi-tenant boundary: another institution should not see it if not global
    const otherInst = await store.getVendorById('ven-1', 'inst-test-2');
    expect(otherInst).toBeNull();
  });

  it('should manage purchase requisitions, orders, line items, and receipts', async () => {
    const req: SupplyPurchaseRequisitionItem = {
      id: 'req-1',
      requisitionNumber: 'REQ-2026-001',
      departmentId: 'dept-cs',
      requesterId: 'staff-1',
      sourceType: 'manual',
      title: 'Lab Compute Server Spares',
      urgency: 'standard',
      estimatedTotalUsd: 4500.0,
      budgetCode: 'BUDGET-CS-2026',
      currentApprovalTier: 'hod',
      status: 'pending_approval',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createRequisition(req);
    const updatedReq = await store.updateRequisitionStatus('req-1', 'approved', 'staff-hod', undefined, 'inst-1');
    expect(updatedReq?.status).toBe('approved');
    expect(updatedReq?.approvedByUserId).toBe('staff-hod');

    const po: SupplyPurchaseOrderItem = {
      id: 'po-1',
      poNumber: 'PO-2026-001',
      requisitionId: 'req-1',
      vendorId: 'ven-1',
      departmentId: 'dept-cs',
      orderDate: '2026-08-21',
      subtotalUsd: 4500.0,
      taxAmountUsd: 0.0,
      shippingAmountUsd: 50.0,
      totalAmountUsd: 4550.0,
      currency: 'USD',
      paymentTerms: 'NET_30',
      shippingAddress: '400 Tech Plaza, Dock A',
      shippingDock: 'DOCK_A_CENTRAL',
      status: 'issued',
      isEncumbered: true,
      merkleLeafHash: 'hash-po-1',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createPurchaseOrder(po);
    const poList = await store.listPurchaseOrders('inst-1');
    expect(poList.length).toBe(1);
    expect(poList[0].poNumber).toBe('PO-2026-001');

    await store.createLineItem({
      id: 'line-1',
      poId: 'po-1',
      lineNumber: 1,
      itemSku: 'RAM-DDR5-64G',
      description: '64GB ECC Server Memory',
      category: 'hardware',
      unitPriceUsd: 150.0,
      quantityOrdered: 30,
      quantityReceived: 0,
      quantityInvoiced: 0,
      unitOfMeasure: 'EA',
      lineTotalUsd: 4500.0,
      status: 'pending',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    });

    const lines = await store.listLineItemsByPo('po-1', 'inst-1');
    expect(lines.length).toBe(1);
    expect(lines[0].itemSku).toBe('RAM-DDR5-64G');

    const grn: SupplyGoodsReceiptItem = {
      id: 'grn-1',
      receiptNumber: 'GRN-2026-001',
      poId: 'po-1',
      vendorId: 'ven-1',
      receivedDate: '2026-08-22',
      receivedByUserId: 'staff-dock',
      warehouseBay: 'BAY_A3',
      dockTag: 'DOCK_A',
      packageCondition: 'good',
      receiverSignature: 'VERIFIED_DOCK_CHIEF',
      status: 'verified',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };

    await store.createGoodsReceipt(grn);
    const grnList = await store.listGoodsReceiptsByPo('po-1', 'inst-1');
    expect(grnList.length).toBe(1);
  });

  it('should handle invoices, 3-way matching, and budget encumbrance liquidation', async () => {
    const invoice: SupplyVendorInvoiceItem = {
      id: 'inv-1',
      invoiceNumber: 'INV-APEX-9981',
      vendorId: 'ven-1',
      poId: 'po-1',
      invoiceDate: '2026-08-22',
      dueDate: '2026-09-22',
      subtotalUsd: 4500.0,
      taxAmountUsd: 0.0,
      totalAmountUsd: 4550.0,
      currency: 'USD',
      status: 'submitted',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createInvoice(invoice);

    const match: SupplyThreeWayMatchItem = {
      id: 'match-1',
      matchId: 'MATCH-2026-001',
      invoiceId: 'inv-1',
      poId: 'po-1',
      receiptId: 'grn-1',
      matchStatus: 'matched',
      priceVariancePercent: 0.0,
      quantityVarianceUnits: 0.0,
      dollarVarianceUsd: 0.0,
      isToleranceCompliant: true,
      debitMemoGenerated: false,
      debitMemoAmountUsd: 0.0,
      paymentVoucherCode: 'VOUCHER-PAY-2026-001',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };

    await store.createThreeWayMatch(match);
    const foundMatch = await store.getThreeWayMatchByInvoiceId('inv-1', 'inst-1');
    expect(foundMatch?.matchStatus).toBe('matched');
    expect(foundMatch?.paymentVoucherCode).toBe('VOUCHER-PAY-2026-001');

    const enc: SupplyBudgetEncumbranceItem = {
      id: 'enc-1',
      encumbranceNumber: 'ENC-2026-001',
      departmentId: 'dept-cs',
      budgetCode: 'BUDGET-CS-2026',
      poId: 'po-1',
      encumberedAmountUsd: 4550.0,
      liquidatedAmountUsd: 0.0,
      remainingEncumberedUsd: 4550.0,
      status: 'active',
      debitAccountCode: 'GL:ENCUMBRANCE_EXPENSE',
      creditAccountCode: 'GL:ENCUMBRANCE_RESERVE',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createEncumbrance(enc);
    const liquidated = await store.liquidateEncumbrance('po-1', 4550.0, 'inst-1');
    expect(liquidated?.status).toBe('fully_liquidated');
    expect(liquidated?.remainingEncumberedUsd).toBe(0);
  });
});
