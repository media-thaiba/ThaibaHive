import { db } from '@thaiba/db';
import {
  twinFacilities,
  twinSpaces,
  twin3dModels,
  twinSensors,
  twinTelemetry,
  twinAssets,
  twinGeofences,
  twinMaintenanceOrders,
  twinWayfindingNodes,
  twinWayfindingEdges,
} from '@thaiba/db/schema';
import { eq, and } from 'drizzle-orm';

type OptionalId<T> = Omit<T, 'id'> & { id?: string };

export interface InMemoryTwinStore {
  facilities: Map<string, any>;
  spaces: Map<string, any>;
  models3d: Map<string, any>;
  sensors: Map<string, any>;
  telemetry: Map<string, any>;
  assets: Map<string, any>;
  geofences: Map<string, any>;
  maintenanceOrders: Map<string, any>;
  wayfindingNodes: Map<string, any>;
  wayfindingEdges: Map<string, any>;
}

export class TwinDbStore {
  private static instance: TwinDbStore;
  private memoryStore: InMemoryTwinStore = {
    facilities: new Map(),
    spaces: new Map(),
    models3d: new Map(),
    sensors: new Map(),
    telemetry: new Map(),
    assets: new Map(),
    geofences: new Map(),
    maintenanceOrders: new Map(),
    wayfindingNodes: new Map(),
    wayfindingEdges: new Map(),
  };

  public static getInstance(): TwinDbStore {
    if (!TwinDbStore.instance) {
      TwinDbStore.instance = new TwinDbStore();
    }
    return TwinDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.facilities.clear();
    this.memoryStore.spaces.clear();
    this.memoryStore.models3d.clear();
    this.memoryStore.sensors.clear();
    this.memoryStore.telemetry.clear();
    this.memoryStore.assets.clear();
    this.memoryStore.geofences.clear();
    this.memoryStore.maintenanceOrders.clear();
    this.memoryStore.wayfindingNodes.clear();
    this.memoryStore.wayfindingEdges.clear();
  }

  // ─── Facilities ───
  async createFacility(data: OptionalId<typeof twinFacilities.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `fac_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.facilities.set(record.facilityId, record);
    try {
      if (db) await db.insert(twinFacilities).values(record as any);
    } catch {}
    return record;
  }

  async getFacilityById(facilityId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.facilities.get(facilityId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listFacilities(tenantId: string = 'global'): Promise<any[]> {
    return Array.from(this.memoryStore.facilities.values()).filter(
      (f) => tenantId === 'global' || f.institutionId === tenantId
    );
  }

  // ─── Spaces ───
  async createSpace(data: OptionalId<typeof twinSpaces.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `spc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.spaces.set(record.spaceId, record);
    try {
      if (db) await db.insert(twinSpaces).values(record as any);
    } catch {}
    return record;
  }

  async getSpaceById(spaceId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.spaces.get(spaceId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listSpaces(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.spaces.values()).filter(
      (s) =>
        (tenantId === 'global' || s.institutionId === tenantId) &&
        (!facilityId || s.facilityId === facilityId)
    );
  }

  async updateSpace(spaceId: string, updates: Partial<typeof twinSpaces.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getSpaceById(spaceId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.spaces.set(spaceId, updated);
    return updated;
  }

  // ─── 3D Models ───
  async create3dModel(data: OptionalId<typeof twin3dModels.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `mod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.models3d.set(record.modelId, record);
    try {
      if (db) await db.insert(twin3dModels).values(record as any);
    } catch {}
    return record;
  }

  async get3dModelById(modelId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.models3d.get(modelId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async list3dModels(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.models3d.values()).filter(
      (m) =>
        (tenantId === 'global' || m.institutionId === tenantId) &&
        (!facilityId || m.facilityId === facilityId)
    );
  }

  // ─── Sensors ───
  async createSensor(data: OptionalId<typeof twinSensors.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `sen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.sensors.set(record.sensorId, record);
    try {
      if (db) await db.insert(twinSensors).values(record as any);
    } catch {}
    return record;
  }

  async getSensorById(sensorId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.sensors.get(sensorId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listSensors(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.sensors.values()).filter(
      (s) =>
        (tenantId === 'global' || s.institutionId === tenantId) &&
        (!facilityId || s.facilityId === facilityId)
    );
  }

  async updateSensor(sensorId: string, updates: Partial<typeof twinSensors.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getSensorById(sensorId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.sensors.set(sensorId, updated);
    return updated;
  }

  // ─── Telemetry ───
  async recordTelemetry(data: OptionalId<typeof twinTelemetry.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.telemetry.set(record.telemetryId, record);
    try {
      if (db) await db.insert(twinTelemetry).values(record as any);
    } catch {}
    return record;
  }

  async listTelemetry(tenantId: string = 'global', sensorId?: string, limit: number = 50): Promise<any[]> {
    const list = Array.from(this.memoryStore.telemetry.values()).filter(
      (t) =>
        (tenantId === 'global' || t.institutionId === tenantId) &&
        (!sensorId || t.sensorId === sensorId)
    );
    return list.slice(-limit);
  }

  // ─── Assets ───
  async createAsset(data: OptionalId<typeof twinAssets.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `ast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.assets.set(record.assetId, record);
    try {
      if (db) await db.insert(twinAssets).values(record as any);
    } catch {}
    return record;
  }

  async getAssetById(assetId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.assets.get(assetId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async getAssetByTagId(tagId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = Array.from(this.memoryStore.assets.values()).find(
      (a) => a.tagId === tagId && (tenantId === 'global' || a.institutionId === tenantId)
    );
    return item || null;
  }

  async listAssets(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.assets.values()).filter(
      (a) =>
        (tenantId === 'global' || a.institutionId === tenantId) &&
        (!facilityId || a.facilityId === facilityId)
    );
  }

  async updateAsset(assetId: string, updates: Partial<typeof twinAssets.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getAssetById(assetId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.assets.set(assetId, updated);
    return updated;
  }

  // ─── Geofences ───
  async createGeofence(data: OptionalId<typeof twinGeofences.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `geo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.geofences.set(record.geofenceId, record);
    try {
      if (db) await db.insert(twinGeofences).values(record as any);
    } catch {}
    return record;
  }

  async getGeofenceById(geofenceId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.geofences.get(geofenceId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listGeofences(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.geofences.values()).filter(
      (g) =>
        (tenantId === 'global' || g.institutionId === tenantId) &&
        (!facilityId || g.facilityId === facilityId)
    );
  }

  // ─── Maintenance Orders ───
  async createMaintenanceOrder(data: OptionalId<typeof twinMaintenanceOrders.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `mord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.maintenanceOrders.set(record.orderId, record);
    try {
      if (db) await db.insert(twinMaintenanceOrders).values(record as any);
    } catch {}
    return record;
  }

  async getMaintenanceOrderById(orderId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.maintenanceOrders.get(orderId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listMaintenanceOrders(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.maintenanceOrders.values()).filter(
      (m) =>
        (tenantId === 'global' || m.institutionId === tenantId) &&
        (!status || m.status === status)
    );
  }

  // ─── Wayfinding Nodes & Edges ───
  async createWayfindingNode(data: OptionalId<typeof twinWayfindingNodes.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `wfn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.wayfindingNodes.set(record.nodeId, record);
    try {
      if (db) await db.insert(twinWayfindingNodes).values(record as any);
    } catch {}
    return record;
  }

  async listWayfindingNodes(tenantId: string = 'global', facilityId?: string, floorLevel?: number): Promise<any[]> {
    return Array.from(this.memoryStore.wayfindingNodes.values()).filter(
      (n) =>
        (tenantId === 'global' || n.institutionId === tenantId) &&
        (!facilityId || n.facilityId === facilityId) &&
        (floorLevel === undefined || n.floorLevel === floorLevel)
    );
  }

  async createWayfindingEdge(data: OptionalId<typeof twinWayfindingEdges.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `wfe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.wayfindingEdges.set(record.edgeId, record);
    try {
      if (db) await db.insert(twinWayfindingEdges).values(record as any);
    } catch {}
    return record;
  }

  async listWayfindingEdges(tenantId: string = 'global', facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.wayfindingEdges.values()).filter(
      (e) =>
        (tenantId === 'global' || e.institutionId === tenantId) &&
        (!facilityId || e.facilityId === facilityId)
    );
  }
}
