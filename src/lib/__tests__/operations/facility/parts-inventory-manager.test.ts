import { partsInventoryManager } from '../../../operations/facility/inventory/parts-inventory-manager';
import { ReorderAllocator } from '../../../operations/facility/inventory/reorder-allocator';
import { facilityStore } from '../../../db/facility-store';

describe('Parts Inventory Management & Automated Reorder Allocation (Sprint-052 FACILITY-010)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should reserve parts when stock is sufficient and detect stockout', async () => {
    await facilityStore.createPart({
      partNumber: 'FILTER-MERV13-24X24',
      name: 'MERV-13 Pleated Air Filter 24x24x2',
      category: 'filters',
      quantityOnHand: 8,
      quantityReserved: 2, // net available = 6
      reorderThreshold: 5,
      unitCost: 18.5,
      institutionId: 'inst_alpha',
    });

    // Request 4 units -> Should succeed
    const res1 = await partsInventoryManager.reserveParts(
      [{ workOrderId: 'WO-101', partNumber: 'FILTER-MERV13-24X24', quantity: 4 }],
      'inst_alpha'
    );
    expect(res1.allReserved).toBe(true);
    expect(res1.results[0].stockout).toBe(false);
    expect(res1.results[0].availableStockRemaining).toBe(2);

    // Request 5 units -> Only 2 left, should fail with stockout
    const res2 = await partsInventoryManager.reserveParts(
      [{ workOrderId: 'WO-102', partNumber: 'FILTER-MERV13-24X24', quantity: 5 }],
      'inst_alpha'
    );
    expect(res2.allReserved).toBe(false);
    expect(res2.results[0].stockout).toBe(true);
  });

  it('should scan inventory and generate automated purchase requisition drafts for low stock items', async () => {
    await facilityStore.createPart({
      partNumber: 'V-BELT-B54',
      name: 'Industrial V-Belt B54',
      category: 'belts',
      quantityOnHand: 3,
      quantityReserved: 1, // net = 2 <= reorderThreshold 5
      reorderThreshold: 5,
      targetStockLevel: 25,
      unitCost: 12.0,
      supplierName: 'Gates Rubber Distribution',
      leadTimeDays: 2,
      institutionId: 'inst_alpha',
    });

    const requisitions = await ReorderAllocator.scanAndGenerateRequisitions('inst_alpha');
    expect(requisitions.length).toBe(1);
    expect(requisitions[0].partNumber).toBe('V-BELT-B54');
    expect(requisitions[0].suggestedReorderQuantity).toBe(23); // target 25 - net 2
    expect(requisitions[0].totalEstimatedCost).toBe(276.0);
    expect(requisitions[0].supplierName).toBe('Gates Rubber Distribution');
  });
});
