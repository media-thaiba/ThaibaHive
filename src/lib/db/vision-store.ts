import { db } from '@thaiba/db';
import { eq, and } from 'drizzle-orm';
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
  public useMemoryOnly: boolean = process.env.NODE_ENV === 'test';
  private hydrated = false;
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
    this.hydrated = false;
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

  private async ensureHydrated(): Promise<void> {
    if (this.useMemoryOnly || this.hydrated || !db) return;
    this.hydrated = true;
    try {
      const [cams, zones, alerts, incs, guards, disps, alprs, whites, locks, audits] = await Promise.all([
        db.select().from(visionCameras),
        db.select().from(visionDetectionZones),
        db.select().from(visionThreatAlerts),
        db.select().from(visionSecurityIncidents),
        db.select().from(visionGuardProfiles),
        db.select().from(visionGuardDispatches),
        db.select().from(visionAlprLogs),
        db.select().from(visionVehicleWhitelist),
        db.select().from(visionLockdownEvents),
        db.select().from(visionPrivacyAuditLogs),
      ]);
      for (const r of cams) if (!this.memoryStore.cameras.has(r.cameraId)) this.memoryStore.cameras.set(r.cameraId, r);
      for (const r of zones) if (!this.memoryStore.detectionZones.has(r.zoneId)) this.memoryStore.detectionZones.set(r.zoneId, r);
      for (const r of alerts) if (!this.memoryStore.threatAlerts.has(r.alertId)) this.memoryStore.threatAlerts.set(r.alertId, r);
      for (const r of incs) if (!this.memoryStore.securityIncidents.has(r.incidentId)) this.memoryStore.securityIncidents.set(r.incidentId, r);
      for (const r of guards) if (!this.memoryStore.guardProfiles.has(r.guardId)) this.memoryStore.guardProfiles.set(r.guardId, r);
      for (const r of disps) if (!this.memoryStore.guardDispatches.has(r.dispatchId)) this.memoryStore.guardDispatches.set(r.dispatchId, r);
      for (const r of alprs) if (!this.memoryStore.alprLogs.has(r.logId)) this.memoryStore.alprLogs.set(r.logId, r);
      for (const r of whites) if (!this.memoryStore.vehicleWhitelist.has(r.plateNumber.toUpperCase())) this.memoryStore.vehicleWhitelist.set(r.plateNumber.toUpperCase(), r);
      for (const r of locks) if (!this.memoryStore.lockdownEvents.has(r.lockdownId)) this.memoryStore.lockdownEvents.set(r.lockdownId, r);
      for (const r of audits) if (!this.memoryStore.privacyAuditLogs.has(r.auditId)) this.memoryStore.privacyAuditLogs.set(r.auditId, r);
    } catch {}
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
      if (db && !this.useMemoryOnly) await db.insert(visionCameras).values(record as any);
    } catch {}
    return record;
  }

  async getCameraById(cameraId: string, tenantId: string = 'global'): Promise<any | null> {
    await this.ensureHydrated();
    const item = this.memoryStore.cameras.get(cameraId);
    if (item && (item.institutionId === tenantId || tenantId === 'global')) {
      return item;
    }
    return null;
  }

  async listCameras(tenantId: string = 'global', facilityId?: string, status?: string): Promise<any[]> {
    await this.ensureHydrated();
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionCameras.cameraId, cameraId), eq(visionCameras.institutionId, tenantId))
          : eq(visionCameras.cameraId, cameraId);
        await db.update(visionCameras).set({ ...updates, updatedAt: updated.updatedAt } as any).where(whereClause);
      }
    } catch {}
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionThreatAlerts.alertId, alertId), eq(visionThreatAlerts.institutionId, tenantId))
          : eq(visionThreatAlerts.alertId, alertId);
        await db.update(visionThreatAlerts).set(updates as any).where(whereClause);
      }
    } catch {}
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionSecurityIncidents.incidentId, incidentId), eq(visionSecurityIncidents.institutionId, tenantId))
          : eq(visionSecurityIncidents.incidentId, incidentId);
        await db.update(visionSecurityIncidents).set({ ...updates, updatedAt: updated.updatedAt } as any).where(whereClause);
      }
    } catch {}
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionGuardProfiles.guardId, guardId), eq(visionGuardProfiles.institutionId, tenantId))
          : eq(visionGuardProfiles.guardId, guardId);
        await db.update(visionGuardProfiles).set({ ...updates, updatedAt: updated.updatedAt } as any).where(whereClause);
      }
    } catch {}
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionGuardDispatches.dispatchId, dispatchId), eq(visionGuardDispatches.institutionId, tenantId))
          : eq(visionGuardDispatches.dispatchId, dispatchId);
        await db.update(visionGuardDispatches).set({ ...updates, updatedAt: updated.updatedAt } as any).where(whereClause);
      }
    } catch {}
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
  private normalizePlateKey(plate: string): string {
    return (plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  async createVehicleWhitelist(data: OptionalId<typeof visionVehicleWhitelist.$inferInsert>): Promise<any> {
    const record = {
      ...data,
      id: data.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.vehicleWhitelist.set(this.normalizePlateKey(record.plateNumber), record);
    try {
      if (db) await db.insert(visionVehicleWhitelist).values(record as any);
    } catch {}
    return record;
  }

  async getVehicleWhitelistByPlate(plateNumber: string, tenantId: string = 'global'): Promise<any | null> {
    const key = this.normalizePlateKey(plateNumber);
    let item = this.memoryStore.vehicleWhitelist.get(key);
    if (!item) {
      item = this.memoryStore.vehicleWhitelist.get(plateNumber.toUpperCase());
    }
    if (!item) {
      for (const [k, v] of this.memoryStore.vehicleWhitelist.entries()) {
        if (this.normalizePlateKey(k) === key) {
          item = v;
          break;
        }
      }
    }
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
    try {
      if (db && !this.useMemoryOnly) {
        const whereClause = tenantId !== 'global'
          ? and(eq(visionLockdownEvents.lockdownId, lockdownId), eq(visionLockdownEvents.institutionId, tenantId))
          : eq(visionLockdownEvents.lockdownId, lockdownId);
        await db.update(visionLockdownEvents).set({ ...updates, updatedAt: updated.updatedAt } as any).where(whereClause);
      }
    } catch {}
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
