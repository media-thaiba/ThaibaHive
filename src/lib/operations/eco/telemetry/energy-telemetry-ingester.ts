/**
 * Energy Telemetry Ingester
 * High-throughput stream ingestion, deduplication, and persistence
 */

import { EcoDbStore } from '../../../db/eco-store';
import { NormalizedEnergyTelemetry } from './energy-protocol-adapters';
import { MicrogridPowerFlowFrame } from '../eco-types';

export class EnergyTelemetryIngester {
  private static instance: EnergyTelemetryIngester;
  private store: EcoDbStore;
  private recentPacketHashes: Set<string> = new Set();
  private batchBuffer: NormalizedEnergyTelemetry[] = [];
  private batchSize: number = 100;
  private listeners: Array<(frame: NormalizedEnergyTelemetry) => void> = [];

  constructor(store?: EcoDbStore) {
    this.store = store || EcoDbStore.getInstance();
  }

  public static getInstance(): EnergyTelemetryIngester {
    if (!EnergyTelemetryIngester.instance) {
      EnergyTelemetryIngester.instance = new EnergyTelemetryIngester();
    }
    return EnergyTelemetryIngester.instance;
  }

  public subscribe(listener: (frame: NormalizedEnergyTelemetry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Ingest single normalized telemetry packet
   */
  public async ingest(telemetry: NormalizedEnergyTelemetry): Promise<{ status: 'accepted' | 'duplicate'; record?: any }> {
    // Sliding deduplication window based on assetId + recordedAt timestamp
    const dedupeKey = `${telemetry.assetId}_${telemetry.recordedAt}`;
    if (this.recentPacketHashes.has(dedupeKey)) {
      return { status: 'duplicate' };
    }

    this.recentPacketHashes.add(dedupeKey);
    // Keep deduplication set bounded to 10,000 items
    if (this.recentPacketHashes.size > 10000) {
      const iter = this.recentPacketHashes.values();
      for (let i = 0; i < 2000; i++) {
        const next = iter.next();
        if (next.done) break;
        this.recentPacketHashes.delete(next.value);
      }
    }

    this.batchBuffer.push(telemetry);

    // Save to store
    const record = await this.store.recordEnergyTelemetry(telemetry);

    // Notify live subscribers
    for (const listener of this.listeners) {
      try {
        listener(telemetry);
      } catch {}
    }

    return { status: 'accepted', record };
  }

  /**
   * Ingest a batch of telemetry packets
   */
  public async ingestBatch(packets: NormalizedEnergyTelemetry[]): Promise<{ accepted: number; duplicates: number }> {
    let accepted = 0;
    let duplicates = 0;

    for (const packet of packets) {
      const res = await this.ingest(packet);
      if (res.status === 'accepted') accepted++;
      else duplicates++;
    }

    return { accepted, duplicates };
  }

  /**
   * Calculate real-time instantaneous campus microgrid power flow snapshot
   */
  public async getCampusPowerSnapshot(tenantId: string = 'global'): Promise<MicrogridPowerFlowFrame> {
    const assets = await this.store.listEnergyAssets(tenantId);
    let solarGenerationKw = 0;
    let windGenerationKw = 0;
    let bessPowerKw = 0;
    let bessSoCPercent = 70;
    let gridImportKw = 0;
    let gridExportKw = 0;
    let evChargingLoadKw = 0;
    let campusFacilityLoadKw = 0;

    const batteries = await this.store.listStorageBatteries(tenantId);
    if (batteries.length > 0) {
      bessSoCPercent = batteries.reduce((acc, b) => acc + (b.currentSoCPercent || 0), 0) / batteries.length;
    }

    for (const asset of assets) {
      const telem = await this.store.queryEnergyTelemetry(asset.assetId, undefined, undefined, 1, tenantId);
      const latest = telem[0];
      if (!latest) continue;

      if (asset.assetType === 'solar_inverter') {
        solarGenerationKw += Math.max(0, latest.powerKw);
      } else if (asset.assetType === 'wind_turbine') {
        windGenerationKw += Math.max(0, latest.powerKw);
      } else if (asset.assetType === 'bess_battery') {
        bessPowerKw += latest.powerKw; // positive = discharge, negative = charge
      } else if (asset.assetType === 'ev_charger') {
        evChargingLoadKw += Math.max(0, latest.powerKw);
      } else if (asset.assetType === 'smart_meter') {
        if (latest.powerKw >= 0) {
          campusFacilityLoadKw += latest.powerKw;
        }
      }
    }

    // Net balance calculation:
    // Generation = solar + wind
    // Net Load = campusFacilityLoad + evChargingLoad
    // If generation + BESS discharge > load => export
    // Else import from grid
    const totalRenewable = solarGenerationKw + windGenerationKw;
    const totalDemand = campusFacilityLoadKw + evChargingLoadKw - bessPowerKw;

    if (totalDemand > totalRenewable) {
      gridImportKw = totalDemand - totalRenewable;
      gridExportKw = 0;
    } else {
      gridImportKw = 0;
      gridExportKw = totalRenewable - totalDemand;
    }

    const netGridBalanceKw = gridImportKw - gridExportKw;
    const realtimeCarbonIntensityGramsPerKwh = gridImportKw > 0 ? 380 * (gridImportKw / (gridImportKw + totalRenewable + 0.001)) : 0;

    return {
      timestamp: new Date().toISOString(),
      solarGenerationKw: Number(solarGenerationKw.toFixed(2)),
      windGenerationKw: Number(windGenerationKw.toFixed(2)),
      bessPowerKw: Number(bessPowerKw.toFixed(2)),
      bessSoCPercent: Number(bessSoCPercent.toFixed(1)),
      gridImportKw: Number(gridImportKw.toFixed(2)),
      gridExportKw: Number(gridExportKw.toFixed(2)),
      evChargingLoadKw: Number(evChargingLoadKw.toFixed(2)),
      campusFacilityLoadKw: Number(campusFacilityLoadKw.toFixed(2)),
      realtimeCarbonIntensityGramsPerKwh: Number(realtimeCarbonIntensityGramsPerKwh.toFixed(1)),
      currentTariffRatePerKwh: 0.18,
      netGridBalanceKw: Number(netGridBalanceKw.toFixed(2)),
    };
  }
}
