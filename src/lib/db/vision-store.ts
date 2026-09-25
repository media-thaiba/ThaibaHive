import { db } from '@thaiba/db';
import {
  visionCameras,
  visionDetectionZones,
  visionThreatAlerts,
  visionSecurityIncidents,
  visionGuardProfiles,
  visionGuardDispatches,
  visionAlprLogs,
  visionVehicleWhitelist,
  visionLockdownEvents,
  visionPrivacyAuditLogs,
} from '@thaiba/db/schema';

type OptionalId<T> = Omit<T, 'id'> & { id?: string };

export interface InMemoryVisionStore {
  cameras: Map<string, any>;
  detectionZones: Map<string, any>;
  threatAlerts: Map<string, any>;
  securityIncidents: Map<string, any>;
  guardProfiles: Map<string, any>;
  guardDispatches: Map<string, any>;
  alprLogs: Map<string, any>;
  vehicleWhitelist: Map<string, any>;
  lockdownEvents: Map<string, any>;
  privacyAuditLogs: Map<string, any>;
}

export class VisionDbStore {
  private static instance: VisionDbStore;
  private memoryStore: InMemoryVisionStore = {
    cameras: new Map(),
    detectionZones: new Map(),
    threatAlerts: new Map(),
    securityIncidents: new Map(),
    guardProfiles: new Map(),
    guardDispatches: new Map(),
    alprLogs: new Map(),
    vehicleWhitelist: new Map(),
    lockdownEvents: new Map(),
    privacyAuditLogs: new Map(),
  };

  public static getInstance(): VisionDbStore {
    if (!VisionDbStore.instance) {
      VisionDbStore.instance = new VisionDbStore();
    }
    return VisionDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.cameras.clear();
    this.memoryStore.detectionZones.clear();
    this.memoryStore.threatAlerts.clear();
    this.memoryStore.securityIncidents.clear();
    this.memoryStore.guardProfiles.clear();
    this.memoryStore.guardDispatches.clear();
    this.memoryStore.alprLogs.clear();
    this.memoryStore.vehicleWhitelist.clear();
    this.memoryStore.lockdownEvents.clear();
    this.memoryStore.privacyAuditLogs.clear();
  }

  // ─── Cameras ───
  async createCamera(data: OptionalId<typeof visionCameras.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `cam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.cameras.set(record.cameraId, record);
    try {
      if (db) await db.insert(visionCameras).values(record as any);
    } catch {}
    return record;
  }

  async getCameraById(cameraId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.cameras.get(cameraId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listCameras(tenantId: string = 'global', facilityId?: string, status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.cameras.values()).filter(
      (c) =>
        (tenantId === 'global' || c.institutionId === tenantId) &&
        (!facilityId || c.facilityId === facilityId) &&
        (!status || c.status === status)
    );
  }

  async updateCamera(cameraId: string, updates: Partial<typeof visionCameras.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getCameraById(cameraId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.cameras.set(cameraId, updated);
    return updated;
  }

  // ─── Detection Zones ───
  async createDetectionZone(data: OptionalId<typeof visionDetectionZones.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `zone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.detectionZones.set(record.zoneId, record);
    try {
      if (db) await db.insert(visionDetectionZones).values(record as any);
    } catch {}
    return record;
  }

  async getDetectionZoneById(zoneId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.detectionZones.get(zoneId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listDetectionZones(tenantId: string = 'global', cameraId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.detectionZones.values()).filter(
      (z) =>
        (tenantId === 'global' || z.institutionId === tenantId) &&
        (!cameraId || z.cameraId === cameraId)
    );
  }

  // ─── Threat Alerts ───
  async recordThreatAlert(data: OptionalId<typeof visionThreatAlerts.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.threatAlerts.set(record.alertId, record);
    try {
      if (db) await db.insert(visionThreatAlerts).values(record as any);
    } catch {}
    return record;
  }

  async getThreatAlertById(alertId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.threatAlerts.get(alertId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listThreatAlerts(
    tenantId: string = 'global',
    status?: string,
    threatType?: string,
    severity?: string
  ): Promise<any[]> {
    return Array.from(this.memoryStore.threatAlerts.values())
      .filter((a) => {
        if (tenantId !== 'global' && a.institutionId !== tenantId) return false;
        if (status && a.status !== status) return false;
        if (threatType && a.threatType !== threatType) return false;
        if (severity && a.severity !== severity) return false;
        return true;
      })
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  async updateThreatAlert(alertId: string, updates: Partial<typeof visionThreatAlerts.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getThreatAlertById(alertId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
    };
    this.memoryStore.threatAlerts.set(alertId, updated);
    return updated;
  }

  // ─── Security Incidents ───
  async createSecurityIncident(data: OptionalId<typeof visionSecurityIncidents.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.securityIncidents.set(record.incidentId, record);
    try {
      if (db) await db.insert(visionSecurityIncidents).values(record as any);
    } catch {}
    return record;
  }

  async getSecurityIncidentById(incidentId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.securityIncidents.get(incidentId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listSecurityIncidents(tenantId: string = 'global', status?: string, facilityId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.securityIncidents.values())
      .filter((i) => {
        if (tenantId !== 'global' && i.institutionId !== tenantId) return false;
        if (status && i.status !== status) return false;
        if (facilityId && i.facilityId !== facilityId) return false;
        return true;
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async updateSecurityIncident(incidentId: string, updates: Partial<typeof visionSecurityIncidents.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getSecurityIncidentById(incidentId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.securityIncidents.set(incidentId, updated);
    return updated;
  }

  // ─── Guard Profiles ───
  async createGuardProfile(data: OptionalId<typeof visionGuardProfiles.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `grd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.guardProfiles.set(record.guardId, record);
    try {
      if (db) await db.insert(visionGuardProfiles).values(record as any);
    } catch {}
    return record;
  }

  async getGuardProfileById(guardId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.guardProfiles.get(guardId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listGuardProfiles(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.guardProfiles.values()).filter(
      (g) =>
        (tenantId === 'global' || g.institutionId === tenantId) &&
        (!status || g.status === status)
    );
  }

  async updateGuardProfile(guardId: string, updates: Partial<typeof visionGuardProfiles.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getGuardProfileById(guardId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.guardProfiles.set(guardId, updated);
    return updated;
  }

  // ─── Guard Dispatches ───
  async createGuardDispatch(data: OptionalId<typeof visionGuardDispatches.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `dsp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.guardDispatches.set(record.dispatchId, record);
    try {
      if (db) await db.insert(visionGuardDispatches).values(record as any);
    } catch {}
    return record;
  }

  async getGuardDispatchById(dispatchId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.guardDispatches.get(dispatchId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listGuardDispatches(tenantId: string = 'global', incidentId?: string, guardId?: string): Promise<any[]> {
    return Array.from(this.memoryStore.guardDispatches.values()).filter(
      (d) =>
        (tenantId === 'global' || d.institutionId === tenantId) &&
        (!incidentId || d.incidentId === incidentId) &&
        (!guardId || d.guardId === guardId)
    );
  }

  async updateGuardDispatch(dispatchId: string, updates: Partial<typeof visionGuardDispatches.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getGuardDispatchById(dispatchId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.guardDispatches.set(dispatchId, updated);
    return updated;
  }

  // ─── ALPR Logs ───
  async recordAlprLog(data: OptionalId<typeof visionAlprLogs.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `alpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.alprLogs.set(record.logId, record);
    try {
      if (db) await db.insert(visionAlprLogs).values(record as any);
    } catch {}
    return record;
  }

  async listAlprLogs(tenantId: string = 'global', plateNumber?: string, direction?: string, limit: number = 100): Promise<any[]> {
    return Array.from(this.memoryStore.alprLogs.values())
      .filter((l) => {
        if (tenantId !== 'global' && l.institutionId !== tenantId) return false;
        if (plateNumber && !l.plateNumber.toLowerCase().includes(plateNumber.toLowerCase())) return false;
        if (direction && l.direction !== direction) return false;
        return true;
      })
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, limit);
  }

  // ─── Vehicle Whitelist ───
  async createVehicleWhitelist(data: OptionalId<typeof visionVehicleWhitelist.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.vehicleWhitelist.set(record.plateNumber.toUpperCase(), record);
    try {
      if (db) await db.insert(visionVehicleWhitelist).values(record as any);
    } catch {}
    return record;
  }

  async getVehicleWhitelistByPlate(plateNumber: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.vehicleWhitelist.get(plateNumber.toUpperCase());
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listVehicleWhitelist(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.vehicleWhitelist.values()).filter(
      (w) =>
        (tenantId === 'global' || w.institutionId === tenantId) &&
        (!status || w.status === status)
    );
  }

  // ─── Lockdown Events ───
  async createLockdownEvent(data: OptionalId<typeof visionLockdownEvents.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `lck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.lockdownEvents.set(record.lockdownId, record);
    try {
      if (db) await db.insert(visionLockdownEvents).values(record as any);
    } catch {}
    return record;
  }

  async getLockdownEventById(lockdownId: string, tenantId: string = 'global'): Promise<any | null> {
    const item = this.memoryStore.lockdownEvents.get(lockdownId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listLockdownEvents(tenantId: string = 'global', status?: string): Promise<any[]> {
    return Array.from(this.memoryStore.lockdownEvents.values())
      .filter((l) => {
        if (tenantId !== 'global' && l.institutionId !== tenantId) return false;
        if (status && l.status !== status) return false;
        return true;
      })
      .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
  }

  async updateLockdownEvent(lockdownId: string, updates: Partial<typeof visionLockdownEvents.$inferInsert>, tenantId: string = 'global'): Promise<any | null> {
    const existing = await this.getLockdownEventById(lockdownId, tenantId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.lockdownEvents.set(lockdownId, updated);
    return updated;
  }

  // ─── Privacy Audit Logs ───
  async recordPrivacyAuditLog(data: OptionalId<typeof visionPrivacyAuditLogs.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `prv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.privacyAuditLogs.set(record.auditId, record);
    try {
      if (db) await db.insert(visionPrivacyAuditLogs).values(record as any);
    } catch {}
    return record;
  }

  async listPrivacyAuditLogs(tenantId: string = 'global', eventType?: string, limit: number = 100): Promise<any[]> {
    return Array.from(this.memoryStore.privacyAuditLogs.values())
      .filter((p) => {
        if (tenantId !== 'global' && p.institutionId !== tenantId) return false;
        if (eventType && p.eventType !== eventType) return false;
        return true;
      })
      .sort((a, b) => b.auditTimestamp.localeCompare(a.auditTimestamp))
      .slice(0, limit);
  }
}
