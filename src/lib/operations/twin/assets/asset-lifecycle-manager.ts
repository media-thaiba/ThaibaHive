import { TwinDbStore } from '../../../db/twin-store';

export interface AssetLifecycleProfile {
  assetId: string;
  name: string;
  purchaseCost: number;
  purchaseDate: string;
  usefulLifeYears: number;
  currentAgeYears: number;
  currentBookValue: number;
  operationalHours: number;
  mtbfHours: number;
  isMaintenanceDue: boolean;
  warrantyStatus: 'active' | 'expiring_soon' | 'expired';
}

export class AssetLifecycleManager {
  private dbStore: TwinDbStore;

  constructor() {
    this.dbStore = TwinDbStore.getInstance();
  }

  public static calculateStraightLineDepreciation(
    purchaseCost: number,
    salvageValue: number = 0,
    usefulLifeYears: number = 5,
    ageYears: number = 1
  ): number {
    if (usefulLifeYears <= 0) return 0;
    const annualDepreciation = (purchaseCost - salvageValue) / usefulLifeYears;
    const totalDepreciation = Math.min(purchaseCost - salvageValue, annualDepreciation * ageYears);
    const currentValue = purchaseCost - totalDepreciation;
    return Number(Math.max(salvageValue, currentValue).toFixed(2));
  }

  public async evaluateAssetMaintenance(
    assetId: string,
    operationalHours: number,
    maintenanceIntervalHours: number = 500,
    tenantId: string = 'global'
  ): Promise<{ isDue: boolean; hoursUntilDue: number }> {
    const hoursSinceLastMaint = operationalHours % maintenanceIntervalHours;
    const isDue = hoursSinceLastMaint >= (maintenanceIntervalHours - 20);
    const hoursUntilDue = Math.max(0, maintenanceIntervalHours - hoursSinceLastMaint);

    if (isDue) {
      const asset = await this.dbStore.getAssetById(assetId, tenantId);
      if (asset) {
        await this.dbStore.createMaintenanceOrder({
          orderId: `MORD-PREVENT-${assetId}-${Date.now().toString().slice(-4)}`,
          facilityId: asset.facilityId,
          spaceId: asset.spaceId,
          assetId: asset.assetId,
          title: `Preventive Maintenance: ${asset.name}`,
          description: `Operational hours (${operationalHours} hrs) reached service threshold (${maintenanceIntervalHours} hrs).`,
          priority: 'medium',
          status: 'pending',
          source: 'ai_predicted',
          institutionId: tenantId,
        });
      }
    }

    return { isDue, hoursUntilDue };
  }
}
