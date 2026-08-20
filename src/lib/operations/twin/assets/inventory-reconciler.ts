export interface CatalogAssetItem {
  assetId: string;
  tagId: string;
  name: string;
  expectedFacilityId: string;
  expectedSpaceId: string;
  category: string;
}

export interface DetectedAssetBeacon {
  tagId: string;
  detectedFacilityId: string;
  detectedSpaceId?: string;
  lastSeenIso: string;
}

export interface InventoryReconciliationReport {
  reconciledAt: string;
  totalCatalogAssets: number;
  matchedCount: number;
  displacedCount: number;
  missingCount: number;
  reconciliationRatePct: number;
  displacedAssets: Array<{
    assetId: string;
    name: string;
    expectedSpaceId: string;
    actualSpaceId: string;
  }>;
  missingAssets: Array<{
    assetId: string;
    name: string;
    lastExpectedSpaceId: string;
  }>;
}

export class InventoryReconciler {
  public static reconcile(
    catalog: CatalogAssetItem[],
    detectedBeacons: DetectedAssetBeacon[]
  ): InventoryReconciliationReport {
    const beaconMap = new Map<string, DetectedAssetBeacon>();
    for (const b of detectedBeacons) {
      beaconMap.set(b.tagId, b);
    }

    let matched = 0;
    const displaced: InventoryReconciliationReport['displacedAssets'] = [];
    const missing: InventoryReconciliationReport['missingAssets'] = [];

    for (const item of catalog) {
      const beacon = beaconMap.get(item.tagId);

      if (!beacon) {
        missing.push({
          assetId: item.assetId,
          name: item.name,
          lastExpectedSpaceId: item.expectedSpaceId,
        });
      } else if (beacon.detectedSpaceId && beacon.detectedSpaceId !== item.expectedSpaceId) {
        displaced.push({
          assetId: item.assetId,
          name: item.name,
          expectedSpaceId: item.expectedSpaceId,
          actualSpaceId: beacon.detectedSpaceId,
        });
      } else {
        matched++;
      }
    }

    const total = catalog.length;
    const rate = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 100;

    return {
      reconciledAt: new Date().toISOString(),
      totalCatalogAssets: total,
      matchedCount: matched,
      displacedCount: displaced.length,
      missingCount: missing.length,
      reconciliationRatePct: rate,
      displacedAssets: displaced,
      missingAssets: missing,
    };
  }
}
