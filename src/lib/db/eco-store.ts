import { db } from '@thaiba/db';
import {
  ecoEnergyAssets,
  ecoGenerationSources,
  ecoStorageBatteries,
  ecoGridTariffs,
  ecoTelemetryEnergy,
  ecoCarbonEmissions,
  ecoEvChargingStations,
  ecoEvFleetSessions,
  ecoEsgReports,
  ecoCarbonOffsets,
} from '@thaiba/db/schema';
import { eq, and } from 'drizzle-orm';

type OptionalId<T> = Omit<T, 'id'> & { id?: string };

export interface InMemoryEcoStore {
  energyAssets: Map<string, any>;
  generationSources: Map<string, any>;
  storageBatteries: Map<string, any>;
  gridTariffs: Map<string, any>;
  telemetryEnergy: Map<string, any>;
  carbonEmissions: Map<string, any>;
  evChargingStations: Map<string, any>;
  evFleetSessions: Map<string, any>;
  esgReports: Map<string, any>;
  carbonOffsets: Map<string, any>;
}

export class EcoDbStore {
  private static instance: EcoDbStore;
  private memoryStore: InMemoryEcoStore = {
    energyAssets: new Map(),
    generationSources: new Map(),
    storageBatteries: new Map(),
    gridTariffs: new Map(),
    telemetryEnergy: new Map(),
    carbonEmissions: new Map(),
    evChargingStations: new Map(),
    evFleetSessions: new Map(),
    esgReports: new Map(),
    carbonOffsets: new Map(),
  };

  public static getInstance(): EcoDbStore {
    if (!EcoDbStore.instance) {
      EcoDbStore.instance = new EcoDbStore();
    }
    return EcoDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.energyAssets.clear();
    this.memoryStore.generationSources.clear();
    this.memoryStore.storageBatteries.clear();
    this.memoryStore.gridTariffs.clear();
    this.memoryStore.telemetryEnergy.clear();
    this.memoryStore.carbonEmissions.clear();
    this.memoryStore.evChargingStations.clear();
    this.memoryStore.evFleetSessions.clear();
    this.memoryStore.esgReports.clear();
    this.memoryStore.carbonOffsets.clear();
  }

  // ─── Energy Assets ───
  async createEnergyAsset(data: OptionalId<typeof ecoEnergyAssets.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `ea_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.energyAssets.set(record.assetId, record);
    try {
      if (db) await db.insert(ecoEnergyAssets).values(record as any);
    } catch {}
    return record;
  }

  async getEnergyAssetById(assetId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.energyAssets.get(assetId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listEnergyAssets(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.energyAssets.values()).filter(
      (a) =>
        (tenantId === 'global' || a.institutionId === tenantId) &&
        (!facilityId || a.facilityId === facilityId)
    );
  }

  async updateEnergyAsset(assetId: string, updates: Partial<typeof ecoEnergyAssets.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getEnergyAssetById(assetId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.energyAssets.set(assetId, updated);
    return updated;
  }

  // ─── Generation Sources ───
  async createGenerationSource(data: OptionalId<typeof ecoGenerationSources.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.generationSources.set(record.sourceId, record);
    try {
      if (db) await db.insert(ecoGenerationSources).values(record as any);
    } catch {}
    return record;
  }

  async getGenerationSourceById(sourceId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.generationSources.get(sourceId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listGenerationSources(tenantId: string = 'global', assetId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.generationSources.values()).filter(
      (g) =>
        (tenantId === 'global' || g.institutionId === tenantId) &&
        (!assetId || g.assetId === assetId)
    );
  }

  // ─── Storage Batteries (BESS) ───
  async createStorageBattery(data: OptionalId<typeof ecoStorageBatteries.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `bat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.storageBatteries.set(record.batteryId, record);
    try {
      if (db) await db.insert(ecoStorageBatteries).values(record as any);
    } catch {}
    return record;
  }

  async getStorageBatteryById(batteryId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.storageBatteries.get(batteryId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listStorageBatteries(tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.storageBatteries.values()).filter(
      (b) => tenantId === 'global' || b.institutionId === tenantId
    );
  }

  async updateStorageBattery(batteryId: string, updates: Partial<typeof ecoStorageBatteries.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getStorageBatteryById(batteryId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.storageBatteries.set(batteryId, updated);
    return updated;
  }

  // ─── Grid Tariffs ───
  async createGridTariff(data: OptionalId<typeof ecoGridTariffs.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.gridTariffs.set(record.tariffId, record);
    try {
      if (db) await db.insert(ecoGridTariffs).values(record as any);
    } catch {}
    return record;
  }

  async getGridTariffById(tariffId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.gridTariffs.get(tariffId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listGridTariffs(tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.gridTariffs.values()).filter(
      (t) => tenantId === 'global' || t.institutionId === tenantId
    );
  }

  // ─── Energy Telemetry ───
  async recordEnergyTelemetry(data: OptionalId<typeof ecoTelemetryEnergy.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `te_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.telemetryEnergy.set(record.telemetryId, record);
    try {
      if (db) await db.insert(ecoTelemetryEnergy).values(record as any);
    } catch {}
    return record;
  }

  async queryEnergyTelemetry(
    assetId: string,
    startTime?: string,
    endTime?: string,
    limit: number = 100,
    tenantId: string = 'global'
  ): Promise<any[]> {
    return Array.from(this.memoryStore.telemetryEnergy.values())
      .filter((t) => {
        if (t.assetId !== assetId) return false;
        if (tenantId !== 'global' && t.institutionId !== tenantId) return false;
        if (startTime && t.recordedAt < startTime) return false;
        if (endTime && t.recordedAt > endTime) return false;
        return true;
      })
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .slice(0, limit);
  }

  // ─── Carbon Emissions ───
  async recordCarbonEmission(data: OptionalId<typeof ecoCarbonEmissions.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `em_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.carbonEmissions.set(record.emissionId, record);
    try {
      if (db) await db.insert(ecoCarbonEmissions).values(record as any);
    } catch {}
    return record;
  }

  async listCarbonEmissions(
    tenantId: string = 'global',
    facilityId?: string,
    scope?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    return Array.from(this.memoryStore.carbonEmissions.values()).filter((e) => {
      if (tenantId !== 'global' && e.institutionId !== tenantId) return false;
      if (facilityId && e.facilityId !== facilityId) return false;
      if (scope && e.scope !== scope) return false;
      if (startDate && e.activityDate < startDate) return false;
      if (endDate && e.activityDate > endDate) return false;
      return true;
    });
  }

  // ─── EV Charging Stations ───
  async createEvChargingStation(data: OptionalId<typeof ecoEvChargingStations.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `evs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.evChargingStations.set(record.stationId, record);
    try {
      if (db) await db.insert(ecoEvChargingStations).values(record as any);
    } catch {}
    return record;
  }

  async getEvChargingStationById(stationId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.evChargingStations.get(stationId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listEvChargingStations(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.evChargingStations.values()).filter(
      (s) =>
        (tenantId === 'global' || s.institutionId === tenantId) &&
        (!facilityId || s.facilityId === facilityId)
    );
  }

  async updateEvChargingStation(stationId: string, updates: Partial<typeof ecoEvChargingStations.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getEvChargingStationById(stationId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.evChargingStations.set(stationId, updated);
    return updated;
  }

  // ─── EV Fleet Sessions ───
  async createEvFleetSession(data: OptionalId<typeof ecoEvFleetSessions.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.evFleetSessions.set(record.sessionId, record);
    try {
      if (db) await db.insert(ecoEvFleetSessions).values(record as any);
    } catch {}
    return record;
  }

  async getEvFleetSessionById(sessionId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.evFleetSessions.get(sessionId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listEvFleetSessions(tenantId: string = 'global', stationId?: string, status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.evFleetSessions.values()).filter(
      (s) =>
        (tenantId === 'global' || s.institutionId === tenantId) &&
        (!stationId || s.stationId === stationId) &&
        (!status || s.status === status)
    );
  }

  async updateEvFleetSession(sessionId: string, updates: Partial<typeof ecoEvFleetSessions.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getEvFleetSessionById(sessionId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.evFleetSessions.set(sessionId, updated);
    return updated;
  }

  // ─── ESG Reports ───
  async createEsgReport(data: OptionalId<typeof ecoEsgReports.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `esg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.esgReports.set(record.reportId, record);
    try {
      if (db) await db.insert(ecoEsgReports).values(record as any);
    } catch {}
    return record;
  }

  async getEsgReportById(reportId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.esgReports.get(reportId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listEsgReports(tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.esgReports.values()).filter(
      (r) => tenantId === 'global' || r.institutionId === tenantId
    );
  }

  async updateEsgReport(reportId: string, updates: Partial<typeof ecoEsgReports.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getEsgReportById(reportId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.esgReports.set(reportId, updated);
    return updated;
  }

  // ─── Carbon Offsets ───
  async createCarbonOffset(data: OptionalId<typeof ecoCarbonOffsets.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.carbonOffsets.set(record.offsetId, record);
    try {
      if (db) await db.insert(ecoCarbonOffsets).values(record as any);
    } catch {}
    return record;
  }

  async getCarbonOffsetById(offsetId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.carbonOffsets.get(offsetId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listCarbonOffsets(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.carbonOffsets.values()).filter(
      (o) =>
        (tenantId === 'global' || o.institutionId === tenantId) &&
        (!status || o.status === status)
    );
  }

  async updateCarbonOffset(offsetId: string, updates: Partial<typeof ecoCarbonOffsets.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getCarbonOffsetById(offsetId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.carbonOffsets.set(offsetId, updated);
    return updated;
  }
}
