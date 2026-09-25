export interface LoadSheddingPlan {
  facilityId: string;
  shedLoads: { assetType: 'hvac' | 'evse' | 'decorative_lighting' | 'canteen'; loadKw: number }[];
  totalPowerShedKw: number;
  guaranteedSecurityRuntimeHours: number;
}

export class BackupPowerPrioritizer {
  public static generateLoadSheddingPlan(
    facilityId: string,
    availableBatteryKwh: number = 300,
    securityBaseLoadKw: number = 25
  ): LoadSheddingPlan {
    const shedLoads: LoadSheddingPlan['shedLoads'] = [
      { assetType: 'evse', loadKw: 50 },
      { assetType: 'hvac', loadKw: 75 },
      { assetType: 'decorative_lighting', loadKw: 15 },
      { assetType: 'canteen', loadKw: 20 },
    ];

    const totalPowerShedKw = shedLoads.reduce((sum, item) => sum + item.loadKw, 0);
    const runtimeHours = Number((availableBatteryKwh / securityBaseLoadKw).toFixed(1));

    return {
      facilityId,
      shedLoads,
      totalPowerShedKw,
      guaranteedSecurityRuntimeHours: runtimeHours,
    };
  }
}
