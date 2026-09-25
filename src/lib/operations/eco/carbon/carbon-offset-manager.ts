/**
 * Carbon Offset & REC Portfolio Manager
 */

import { EcoDbStore } from '../../../db/eco-store';
import { RecRetirementTracker, OffsetRetirementCertificate } from './rec-retirement-tracker';

export class CarbonOffsetManager {
  private store: EcoDbStore;

  constructor(store?: EcoDbStore) {
    this.store = store || EcoDbStore.getInstance();
  }

  /**
   * Register newly purchased verified carbon offset or REC
   */
  public async registerOffset(
    offset: {
      offsetId: string;
      certificateNumber: string;
      registry?: string;
      offsetType?: string;
      vintageYear: number;
      quantityTonsCo2e: number;
      costPerTon?: number;
      institutionId: string;
    }
  ): Promise<any> {
    return await this.store.createCarbonOffset({
      offsetId: offset.offsetId,
      certificateNumber: offset.certificateNumber,
      registry: offset.registry || 'verra_vcs',
      offsetType: offset.offsetType || 'reforestation',
      vintageYear: offset.vintageYear,
      quantityTonsCo2e: offset.quantityTonsCo2e,
      costPerTon: offset.costPerTon || 20.0,
      status: 'active',
      institutionId: offset.institutionId,
    });
  }

  /**
   * Retire offset credits against a specific compliance period
   */
  public async retireOffset(
    offsetId: string,
    reportingPeriod: string,
    institutionId: string = 'global'
  ): Promise<{ success: boolean; certificate?: OffsetRetirementCertificate; error?: string }> {
    const existing = await this.store.getCarbonOffsetById(offsetId, institutionId);
    if (!existing) {
      return { success: false, error: 'Offset record not found' };
    }

    if (existing.status === 'retired') {
      return { success: false, error: `Offset certificate ${existing.certificateNumber} is already retired for period ${existing.retiredForPeriod}` };
    }

    // Generate cryptographic retirement certificate
    const cert = RecRetirementTracker.generateRetirementCertificate(
      existing.certificateNumber,
      existing.registry,
      existing.offsetType,
      existing.quantityTonsCo2e,
      reportingPeriod,
      institutionId
    );

    // Update store
    await this.store.updateCarbonOffset(
      offsetId,
      {
        status: 'retired',
        retiredForPeriod: reportingPeriod,
        verificationHash: cert.verificationHash,
      },
      institutionId
    );

    return { success: true, certificate: cert };
  }

  /**
   * Get total active and retired offset balance in Tons CO2e
   */
  public async getOffsetBalance(institutionId: string = 'global'): Promise<{
    activeTonsCo2e: number;
    retiredTonsCo2e: number;
    totalPortfolioTonsCo2e: number;
  }> {
    const all = await this.store.listCarbonOffsets(institutionId);
    let active = 0;
    let retired = 0;

    for (const o of all) {
      if (o.status === 'active') active += o.quantityTonsCo2e;
      else if (o.status === 'retired') retired += o.quantityTonsCo2e;
    }

    return {
      activeTonsCo2e: Number(active.toFixed(2)),
      retiredTonsCo2e: Number(retired.toFixed(2)),
      totalPortfolioTonsCo2e: Number((active + retired).toFixed(2)),
    };
  }
}
