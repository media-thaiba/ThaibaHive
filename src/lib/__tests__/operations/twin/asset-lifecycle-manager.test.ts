import { AssetLifecycleManager } from '../../../operations/twin/assets/asset-lifecycle-manager';
import { InventoryReconciler } from '../../../operations/twin/assets/inventory-reconciler';
import { TwinDbStore } from '../../../db/twin-store';

describe('Asset Lifecycle Manager & Inventory Reconciler', () => {
  let dbStore: TwinDbStore;
  let manager: AssetLifecycleManager;

  beforeEach(() => {
    dbStore = TwinDbStore.getInstance();
    dbStore.clearMemoryStore();
    manager = new AssetLifecycleManager();
  });

  it('should calculate straight line depreciation', () => {
    const value = AssetLifecycleManager.calculateStraightLineDepreciation(50000, 5000, 5, 2);
    // (50000 - 5000) / 5 = 9000/yr. 50000 - 18000 = 32000
    expect(value).toBe(32000);
  });

  it('should reconcile physical inventory and flag missing & displaced equipment', () => {
    const catalog = [
      { assetId: 'A1', tagId: 'TAG1', name: 'Microscope A', expectedFacilityId: 'F1', expectedSpaceId: 'ROOM-1', category: 'lab' },
      { assetId: 'A2', tagId: 'TAG2', name: 'Oscilloscope B', expectedFacilityId: 'F1', expectedSpaceId: 'ROOM-1', category: 'lab' },
      { assetId: 'A3', tagId: 'TAG3', name: 'Server Rack C', expectedFacilityId: 'F1', expectedSpaceId: 'SERVER-ROOM', category: 'it' },
    ];

    const detected = [
      { tagId: 'TAG1', detectedFacilityId: 'F1', detectedSpaceId: 'ROOM-1', lastSeenIso: new Date().toISOString() }, // Matched
      { tagId: 'TAG2', detectedFacilityId: 'F1', detectedSpaceId: 'ROOM-99', lastSeenIso: new Date().toISOString() }, // Displaced
      // TAG3 missing
    ];

    const report = InventoryReconciler.reconcile(catalog, detected);
    expect(report.totalCatalogAssets).toBe(3);
    expect(report.matchedCount).toBe(1);
    expect(report.displacedCount).toBe(1);
    expect(report.missingCount).toBe(1);
    expect(report.displacedAssets[0].name).toBe('Oscilloscope B');
    expect(report.missingAssets[0].name).toBe('Server Rack C');
  });

  it('should trigger preventive maintenance work order when hours threshold is met', async () => {
    await dbStore.createFacility({
      facilityId: 'FAC-ENG',
      name: 'Engineering Hall',
      code: 'ENG',
      institutionId: 'inst_01',
    });

    await dbStore.createAsset({
      assetId: 'AST-CENTRIFUGE',
      facilityId: 'FAC-ENG',
      tagId: 'TAG-CENT-01',
      name: 'Centrifuge Alpha',
      operationalHours: 495,
      institutionId: 'inst_01',
    });

    const status = await manager.evaluateAssetMaintenance('AST-CENTRIFUGE', 495, 500, 'inst_01');
    expect(status.isDue).toBe(true);

    const orders = await dbStore.listMaintenanceOrders('inst_01');
    expect(orders.length).toBe(1);
    expect(orders[0].title).toContain('Centrifuge Alpha');
  });
});
