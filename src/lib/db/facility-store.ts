import { db } from '@thaiba/db';
import {
  facilityEquipment,
  facilityTelemetrySensors,
  facilitySensorReadings,
  facilityPredictiveModels,
  facilityAnomalyAlerts,
  facilityWorkOrders,
  facilityPartsInventory,
  facilityContractorRegistry,
  facilityAuditLogs,
} from '@thaiba/db/schema';
import {
  FacilityEquipmentItem,
  FacilitySensorItem,
  FacilitySensorReadingItem,
  FacilityPredictiveModelItem,
  FacilityAnomalyAlertItem,
  FacilityWorkOrderItem,
  FacilityPartsInventoryItem,
  FacilityWorkOrderPartItem,
  FacilityContractorRegistryItem,
  FacilityAuditLogItem,
  EquipmentCategory,
  EquipmentStatus,
  WorkOrderStatus,
  WorkOrderPriority,
  AnomalyAlertStatus,
  AnomalySeverity,
  SensorType,
} from '../operations/facility/facility-types';

export interface InMemoryFacilityStore {
  equipment: Map<string, FacilityEquipmentItem>;
  sensors: Map<string, FacilitySensorItem>;
  readings: Map<string, FacilitySensorReadingItem>;
  models: Map<string, FacilityPredictiveModelItem>;
  alerts: Map<string, FacilityAnomalyAlertItem>;
  workOrders: Map<string, FacilityWorkOrderItem>;
  inventory: Map<string, FacilityPartsInventoryItem>;
  workOrderParts: Map<string, FacilityWorkOrderPartItem>;
  contractors: Map<string, FacilityContractorRegistryItem>;
  auditLogs: Map<string, FacilityAuditLogItem>;
}

export class FacilityDbStore {
  private static instance: FacilityDbStore;
  private memoryStore: InMemoryFacilityStore = {
    equipment: new Map(),
    sensors: new Map(),
    readings: new Map(),
    models: new Map(),
    alerts: new Map(),
    workOrders: new Map(),
    inventory: new Map(),
    workOrderParts: new Map(),
    contractors: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): FacilityDbStore {
    if (!FacilityDbStore.instance) {
      FacilityDbStore.instance = new FacilityDbStore();
    }
    return FacilityDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.equipment.clear();
    this.memoryStore.sensors.clear();
    this.memoryStore.readings.clear();
    this.memoryStore.models.clear();
    this.memoryStore.alerts.clear();
    this.memoryStore.workOrders.clear();
    this.memoryStore.inventory.clear();
    this.memoryStore.workOrderParts.clear();
    this.memoryStore.contractors.clear();
    this.memoryStore.auditLogs.clear();
  }

  // ─── 1. Equipment Assets ───
  async createEquipment(data: Partial<FacilityEquipmentItem> & { assetTag: string; name: string; buildingId: string; floorId: string }): Promise<FacilityEquipmentItem> {
    const record: FacilityEquipmentItem = {
      id: data.id || `equip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      assetTag: data.assetTag,
      name: data.name,
      category: data.category || 'hvac',
      buildingId: data.buildingId,
      floorId: data.floorId,
      roomId: data.roomId || null,
      spatialCoordinatesJson: data.spatialCoordinatesJson || null,
      manufacturer: data.manufacturer || null,
      modelNumber: data.modelNumber || null,
      serialNumber: data.serialNumber || null,
      installDate: data.installDate || null,
      warrantyExpiry: data.warrantyExpiry || null,
      status: data.status || 'operational',
      criticality: data.criticality || 'medium',
      healthScore: data.healthScore ?? 100.0,
      metadataJson: data.metadataJson || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.equipment.set(record.id, record);
    this.memoryStore.equipment.set(record.assetTag, record);
    try {
      if (db) await db.insert(facilityEquipment).values(record as any);
    } catch {}
    return record;
  }

  async getEquipmentById(idOrTag: string, tenantId: string = 'global'): Promise<FacilityEquipmentItem | null> {
    const item = this.memoryStore.equipment.get(idOrTag);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.equipment.values()) {
      if ((val.id === idOrTag || val.assetTag === idOrTag) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listEquipment(tenantId: string = 'global', category?: EquipmentCategory): Promise<FacilityEquipmentItem[]> {
    const results: FacilityEquipmentItem[] = [];
    const seen = new Set<string>();
    for (const item of this.memoryStore.equipment.values()) {
      if (item.institutionId === tenantId && !seen.has(item.id)) {
        seen.add(item.id);
        if (!category || item.category === category) {
          results.push(item);
        }
      }
    }
    return results;
  }

  async updateEquipmentStatus(idOrTag: string, status: EquipmentStatus, healthScore?: number, tenantId: string = 'global'): Promise<FacilityEquipmentItem | null> {
    const equip = await this.getEquipmentById(idOrTag, tenantId);
    if (!equip) return null;
    equip.status = status;
    if (typeof healthScore === 'number') equip.healthScore = healthScore;
    equip.updatedAt = new Date().toISOString();
    this.memoryStore.equipment.set(equip.id, equip);
    this.memoryStore.equipment.set(equip.assetTag, equip);
    return equip;
  }

  // ─── 2. Telemetry Sensors ───
  async registerSensor(data: Partial<FacilitySensorItem> & { sensorId: string; equipmentId: string; sensorType: SensorType }): Promise<FacilitySensorItem> {
    const record: FacilitySensorItem = {
      id: data.id || `sensor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sensorId: data.sensorId,
      equipmentId: data.equipmentId,
      sensorType: data.sensorType,
      sensorModel: data.sensorModel || null,
      protocol: data.protocol || 'mqtt',
      endpointUrl: data.endpointUrl || null,
      pollingIntervalSec: data.pollingIntervalSec ?? 60,
      unit: data.unit || 'celsius',
      minThreshold: data.minThreshold ?? null,
      maxThreshold: data.maxThreshold ?? null,
      deadbandPercent: data.deadbandPercent ?? 1.5,
      status: data.status || 'active',
      lastReadingValue: data.lastReadingValue ?? null,
      lastReadingAt: data.lastReadingAt ?? null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.sensors.set(record.id, record);
    this.memoryStore.sensors.set(record.sensorId, record);
    try {
      if (db) await db.insert(facilityTelemetrySensors).values(record as any);
    } catch {}
    return record;
  }

  async getSensorById(idOrSensorId: string, tenantId: string = 'global'): Promise<FacilitySensorItem | null> {
    const sensor = this.memoryStore.sensors.get(idOrSensorId);
    if (sensor && sensor.institutionId === tenantId) return sensor;
    for (const val of this.memoryStore.sensors.values()) {
      if ((val.id === idOrSensorId || val.sensorId === idOrSensorId) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listSensorsForEquipment(equipmentId: string, tenantId: string = 'global'): Promise<FacilitySensorItem[]> {
    const results: FacilitySensorItem[] = [];
    const seen = new Set<string>();
    for (const item of this.memoryStore.sensors.values()) {
      if (item.equipmentId === equipmentId && item.institutionId === tenantId && !seen.has(item.id)) {
        seen.add(item.id);
        results.push(item);
      }
    }
    return results;
  }

  async updateSensorReading(sensorId: string, value: number, tenantId: string = 'global'): Promise<FacilitySensorItem | null> {
    const sensor = await this.getSensorById(sensorId, tenantId);
    if (!sensor) return null;
    sensor.lastReadingValue = value;
    sensor.lastReadingAt = new Date().toISOString();
    sensor.updatedAt = new Date().toISOString();
    this.memoryStore.sensors.set(sensor.id, sensor);
    this.memoryStore.sensors.set(sensor.sensorId, sensor);
    return sensor;
  }

  // ─── 3. Sensor Readings ───
  async recordSensorReading(data: Partial<FacilitySensorReadingItem> & { sensorId: string; equipmentId: string; readingValue: number }): Promise<FacilitySensorReadingItem> {
    const record: FacilitySensorReadingItem = {
      id: data.id || `read_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      readingId: data.readingId || `rid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sensorId: data.sensorId,
      equipmentId: data.equipmentId,
      readingValue: data.readingValue,
      unit: data.unit || 'celsius',
      anomalyScore: data.anomalyScore ?? 0.0,
      isAnomaly: data.isAnomaly ?? false,
      rawPayloadJson: data.rawPayloadJson || null,
      recordedAt: data.recordedAt || new Date().toISOString(),
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.readings.set(record.readingId, record);
    try {
      if (db) await db.insert(facilitySensorReadings).values(record as any);
    } catch {}
    return record;
  }

  async listReadingsForSensor(sensorId: string, tenantId: string = 'global', limit: number = 100): Promise<FacilitySensorReadingItem[]> {
    const results: FacilitySensorReadingItem[] = [];
    for (const item of this.memoryStore.readings.values()) {
      if (item.sensorId === sensorId && item.institutionId === tenantId) {
        results.push(item);
      }
    }
    return results.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, limit);
  }

  // ─── 4. Predictive Models ───
  async registerModel(data: Partial<FacilityPredictiveModelItem> & { modelId: string; equipmentCategory: string; modelType: any }): Promise<FacilityPredictiveModelItem> {
    const record: FacilityPredictiveModelItem = {
      id: data.id || `model_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      modelId: data.modelId,
      equipmentCategory: data.equipmentCategory,
      modelType: data.modelType,
      version: data.version || '1.0.0',
      status: data.status || 'active',
      accuracyMetricsJson: data.accuracyMetricsJson || null,
      hyperparametersJson: data.hyperparametersJson || null,
      weightsPath: data.weightsPath || null,
      lastTrainedAt: data.lastTrainedAt || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.models.set(record.modelId, record);
    try {
      if (db) await db.insert(facilityPredictiveModels).values(record as any);
    } catch {}
    return record;
  }

  async getModel(modelId: string, tenantId: string = 'global'): Promise<FacilityPredictiveModelItem | null> {
    const item = this.memoryStore.models.get(modelId);
    if (item && item.institutionId === tenantId) return item;
    return null;
  }

  // ─── 5. Anomaly Alerts ───
  async createAnomalyAlert(data: Partial<FacilityAnomalyAlertItem> & { alertId: string; equipmentId: string; severity: AnomalySeverity }): Promise<FacilityAnomalyAlertItem> {
    const record: FacilityAnomalyAlertItem = {
      id: data.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      alertId: data.alertId,
      equipmentId: data.equipmentId,
      sensorId: data.sensorId || null,
      alertType: data.alertType || 'sensor_drift',
      severity: data.severity,
      anomalyScore: data.anomalyScore ?? 0.5,
      predictedFailureMode: data.predictedFailureMode || null,
      estimatedRulHours: data.estimatedRulHours ?? null,
      rootCauseHypothesis: data.rootCauseHypothesis || null,
      status: data.status || 'open',
      acknowledgedByStaffId: data.acknowledgedByStaffId || null,
      acknowledgedAt: data.acknowledgedAt || null,
      resolutionNotes: data.resolutionNotes || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.alerts.set(record.alertId, record);
    try {
      if (db) await db.insert(facilityAnomalyAlerts).values(record as any);
    } catch {}
    return record;
  }

  async listAnomalyAlerts(tenantId: string = 'global', status?: AnomalyAlertStatus): Promise<FacilityAnomalyAlertItem[]> {
    const results: FacilityAnomalyAlertItem[] = [];
    for (const item of this.memoryStore.alerts.values()) {
      if (item.institutionId === tenantId) {
        if (!status || item.status === status) {
          results.push(item);
        }
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateAlertStatus(alertId: string, status: AnomalyAlertStatus, notes?: string, staffId?: string, tenantId: string = 'global'): Promise<FacilityAnomalyAlertItem | null> {
    const alert = this.memoryStore.alerts.get(alertId);
    if (!alert || alert.institutionId !== tenantId) return null;
    alert.status = status;
    if (notes) alert.resolutionNotes = notes;
    if (staffId) {
      alert.acknowledgedByStaffId = staffId;
      alert.acknowledgedAt = new Date().toISOString();
    }
    alert.updatedAt = new Date().toISOString();
    this.memoryStore.alerts.set(alertId, alert);
    return alert;
  }

  // ─── 6. Work Orders ───
  async createWorkOrder(data: Partial<FacilityWorkOrderItem> & { workOrderNumber: string; title: string; buildingId: string; floorId: string }): Promise<FacilityWorkOrderItem> {
    const record: FacilityWorkOrderItem = {
      id: data.id || `wo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workOrderNumber: data.workOrderNumber,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'routine',
      category: data.category || 'general',
      status: data.status || 'draft',
      equipmentId: data.equipmentId || null,
      anomalyAlertId: data.anomalyAlertId || null,
      buildingId: data.buildingId,
      floorId: data.floorId,
      roomId: data.roomId || null,
      spatialRouteDataJson: data.spatialRouteDataJson || null,
      assignedTechnicianId: data.assignedTechnicianId || null,
      assignedContractorId: data.assignedContractorId || null,
      estimatedDurationMinutes: data.estimatedDurationMinutes ?? 60,
      actualDurationMinutes: data.actualDurationMinutes || null,
      scheduledStartTime: data.scheduledStartTime || null,
      scheduledEndTime: data.scheduledEndTime || null,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      verifiedAt: data.verifiedAt || null,
      verifiedByStaffId: data.verifiedByStaffId || null,
      resolutionSummary: data.resolutionSummary || null,
      technicianSignature: data.technicianSignature || null,
      photoEvidenceJson: data.photoEvidenceJson || null,
      merkleAuditHash: data.merkleAuditHash || '',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.workOrders.set(record.id, record);
    this.memoryStore.workOrders.set(record.workOrderNumber, record);
    try {
      if (db) await db.insert(facilityWorkOrders).values(record as any);
    } catch {}
    return record;
  }

  async getWorkOrder(idOrNumber: string, tenantId: string = 'global'): Promise<FacilityWorkOrderItem | null> {
    const item = this.memoryStore.workOrders.get(idOrNumber);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.workOrders.values()) {
      if ((val.id === idOrNumber || val.workOrderNumber === idOrNumber) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listWorkOrders(tenantId: string = 'global', status?: WorkOrderStatus, priority?: WorkOrderPriority): Promise<FacilityWorkOrderItem[]> {
    const results: FacilityWorkOrderItem[] = [];
    const seen = new Set<string>();
    for (const item of this.memoryStore.workOrders.values()) {
      if (item.institutionId === tenantId && !seen.has(item.id)) {
        seen.add(item.id);
        if (!status || item.status === status) {
          if (!priority || item.priority === priority) {
            results.push(item);
          }
        }
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateWorkOrderStatus(idOrNumber: string, status: WorkOrderStatus, updates: Partial<FacilityWorkOrderItem> = {}, tenantId: string = 'global'): Promise<FacilityWorkOrderItem | null> {
    const wo = await this.getWorkOrder(idOrNumber, tenantId);
    if (!wo) return null;
    wo.status = status;
    Object.assign(wo, updates);
    wo.updatedAt = new Date().toISOString();
    this.memoryStore.workOrders.set(wo.id, wo);
    this.memoryStore.workOrders.set(wo.workOrderNumber, wo);
    return wo;
  }

  // ─── 7. Parts Inventory ───
  async createPart(data: Partial<FacilityPartsInventoryItem> & { partNumber: string; name: string }): Promise<FacilityPartsInventoryItem> {
    const record: FacilityPartsInventoryItem = {
      id: data.id || `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partNumber: data.partNumber,
      name: data.name,
      description: data.description || null,
      category: data.category || 'filters',
      quantityOnHand: data.quantityOnHand ?? 0,
      quantityReserved: data.quantityReserved ?? 0,
      reorderThreshold: data.reorderThreshold ?? 5,
      targetStockLevel: data.targetStockLevel ?? 20,
      unitCost: data.unitCost ?? 0.0,
      supplierName: data.supplierName || null,
      leadTimeDays: data.leadTimeDays ?? 3,
      compatibleEquipmentCategories: data.compatibleEquipmentCategories || null,
      locationBin: data.locationBin || null,
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.inventory.set(record.id, record);
    this.memoryStore.inventory.set(record.partNumber, record);
    try {
      if (db) await db.insert(facilityPartsInventory).values(record as any);
    } catch {}
    return record;
  }

  async getPart(idOrNumber: string, tenantId: string = 'global'): Promise<FacilityPartsInventoryItem | null> {
    const item = this.memoryStore.inventory.get(idOrNumber);
    if (item && item.institutionId === tenantId) return item;
    for (const val of this.memoryStore.inventory.values()) {
      if ((val.id === idOrNumber || val.partNumber === idOrNumber) && val.institutionId === tenantId) {
        return val;
      }
    }
    return null;
  }

  async listParts(tenantId: string = 'global'): Promise<FacilityPartsInventoryItem[]> {
    const results: FacilityPartsInventoryItem[] = [];
    const seen = new Set<string>();
    for (const item of this.memoryStore.inventory.values()) {
      if (item.institutionId === tenantId && !seen.has(item.id)) {
        seen.add(item.id);
        results.push(item);
      }
    }
    return results;
  }

  async reservePart(idOrNumber: string, quantity: number, tenantId: string = 'global'): Promise<boolean> {
    const part = await this.getPart(idOrNumber, tenantId);
    if (!part) return false;
    if (part.quantityOnHand - part.quantityReserved < quantity) return false;
    part.quantityReserved += quantity;
    part.updatedAt = new Date().toISOString();
    this.memoryStore.inventory.set(part.id, part);
    this.memoryStore.inventory.set(part.partNumber, part);
    return true;
  }

  async consumePart(idOrNumber: string, quantity: number, tenantId: string = 'global'): Promise<boolean> {
    const part = await this.getPart(idOrNumber, tenantId);
    if (!part) return false;
    if (part.quantityOnHand < quantity) return false;
    part.quantityOnHand -= quantity;
    part.quantityReserved = Math.max(0, part.quantityReserved - quantity);
    part.updatedAt = new Date().toISOString();
    this.memoryStore.inventory.set(part.id, part);
    this.memoryStore.inventory.set(part.partNumber, part);
    return true;
  }

  // ─── 8. Contractor Registry ───
  async registerContractor(data: Partial<FacilityContractorRegistryItem> & { contractorId: string; companyName: string; contactName: string; email: string; phone: string; specializationsJson: string }): Promise<FacilityContractorRegistryItem> {
    const record: FacilityContractorRegistryItem = {
      id: data.id || `cont_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contractorId: data.contractorId,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      specializationsJson: data.specializationsJson,
      ratePerHour: data.ratePerHour ?? 75.0,
      slaEmergencyHours: data.slaEmergencyHours ?? 2,
      slaRoutineHours: data.slaRoutineHours ?? 24,
      performanceRating: data.performanceRating ?? 5.0,
      activeInsuranceExpiry: data.activeInsuranceExpiry || null,
      status: data.status || 'active',
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    this.memoryStore.contractors.set(record.contractorId, record);
    try {
      if (db) await db.insert(facilityContractorRegistry).values(record as any);
    } catch {}
    return record;
  }

  async listContractors(tenantId: string = 'global'): Promise<FacilityContractorRegistryItem[]> {
    const results: FacilityContractorRegistryItem[] = [];
    for (const item of this.memoryStore.contractors.values()) {
      if (item.institutionId === tenantId) {
        results.push(item);
      }
    }
    return results;
  }

  // ─── 9. Audit Logs ───
  async appendAuditLog(data: Partial<FacilityAuditLogItem> & { auditId: string; actorId: string; actorRole: string; action: string; entityType: string; entityId: string; payloadHash: string }): Promise<FacilityAuditLogItem> {
    const record: FacilityAuditLogItem = {
      id: data.id || `f_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      auditId: data.auditId,
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      payloadHash: data.payloadHash,
      prevMerkleRoot: data.prevMerkleRoot || '',
      merkleRoot: data.merkleRoot || '',
      timestamp: data.timestamp || new Date().toISOString(),
      institutionId: data.institutionId || 'global',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.memoryStore.auditLogs.set(record.auditId, record);
    try {
      if (db) await db.insert(facilityAuditLogs).values(record as any);
    } catch {}
    return record;
  }

  async listAuditLogs(tenantId: string = 'global', entityId?: string): Promise<FacilityAuditLogItem[]> {
    const results: FacilityAuditLogItem[] = [];
    for (const item of this.memoryStore.auditLogs.values()) {
      if (item.institutionId === tenantId) {
        if (!entityId || item.entityId === entityId) {
          results.push(item);
        }
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const facilityStore = FacilityDbStore.getInstance();
