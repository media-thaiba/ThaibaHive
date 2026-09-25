export type EquipmentCategory =
  | 'hvac'
  | 'elevator'
  | 'plumbing'
  | 'electrical'
  | 'generator'
  | 'fire_safety';

export type EquipmentStatus = 'operational' | 'degraded' | 'offline' | 'maintenance';
export type EquipmentCriticality = 'critical' | 'high' | 'medium' | 'low';

export type SensorType =
  | 'temperature'
  | 'vibration'
  | 'pressure'
  | 'flow_rate'
  | 'power_draw'
  | 'filter_delta_p'
  | 'refrigerant_pressure'
  | 'runtime_hours';

export type IngestionProtocol = 'mqtt' | 'modbus' | 'bacnet' | 'rest';
export type SensorStatus = 'active' | 'warning' | 'critical' | 'offline';

export type PredictiveModelType =
  | 'statistical_drift'
  | 'vibration_fft'
  | 'thermal_degradation'
  | 'rul_estimator';

export type ModelStatus = 'active' | 'training' | 'deprecated';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';
export type AnomalyAlertStatus =
  | 'open'
  | 'acknowledged'
  | 'triaged'
  | 'work_order_created'
  | 'resolved'
  | 'false_positive';

export type WorkOrderPriority = 'emergency' | 'urgent' | 'routine' | 'preventive';
export type WorkOrderCategory = 'electrical' | 'hvac' | 'plumbing' | 'mechanical' | 'elevator' | 'general';
export type WorkOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'pending_parts'
  | 'completed'
  | 'verified'
  | 'cancelled';

export type PartCategory =
  | 'filters'
  | 'belts'
  | 'lubricants'
  | 'bearings'
  | 'valves'
  | 'electrical'
  | 'general';

export type WorkOrderPartStatus = 'allocated' | 'consumed' | 'returned';
export type ContractorStatus = 'active' | 'inactive' | 'suspended';

export interface SpatialCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface FacilityEquipmentItem {
  id: string;
  assetTag: string;
  name: string;
  category: EquipmentCategory;
  buildingId: string;
  floorId: string;
  roomId?: string | null;
  spatialCoordinatesJson?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  installDate?: string | null;
  warrantyExpiry?: string | null;
  status: EquipmentStatus;
  criticality: EquipmentCriticality;
  healthScore: number;
  metadataJson?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilitySensorItem {
  id: string;
  sensorId: string;
  equipmentId: string;
  sensorType: SensorType;
  sensorModel?: string | null;
  protocol: IngestionProtocol;
  endpointUrl?: string | null;
  pollingIntervalSec: number;
  unit: string;
  minThreshold?: number | null;
  maxThreshold?: number | null;
  deadbandPercent: number;
  status: SensorStatus;
  lastReadingValue?: number | null;
  lastReadingAt?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilitySensorReadingItem {
  id: string;
  readingId: string;
  sensorId: string;
  equipmentId: string;
  readingValue: number;
  unit: string;
  anomalyScore: number;
  isAnomaly: boolean;
  rawPayloadJson?: string | null;
  recordedAt: string;
  institutionId: string;
  createdAt: string;
}

export interface FacilityPredictiveModelItem {
  id: string;
  modelId: string;
  equipmentCategory: string;
  modelType: PredictiveModelType;
  version: string;
  status: ModelStatus;
  accuracyMetricsJson?: string | null;
  hyperparametersJson?: string | null;
  weightsPath?: string | null;
  lastTrainedAt?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityAnomalyAlertItem {
  id: string;
  alertId: string;
  equipmentId: string;
  sensorId?: string | null;
  alertType: string;
  severity: AnomalySeverity;
  anomalyScore: number;
  predictedFailureMode?: string | null;
  estimatedRulHours?: number | null;
  rootCauseHypothesis?: string | null;
  status: AnomalyAlertStatus;
  acknowledgedByStaffId?: string | null;
  acknowledgedAt?: string | null;
  resolutionNotes?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityWorkOrderItem {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  status: WorkOrderStatus;
  equipmentId?: string | null;
  anomalyAlertId?: string | null;
  buildingId: string;
  floorId: string;
  roomId?: string | null;
  spatialRouteDataJson?: string | null;
  assignedTechnicianId?: string | null;
  assignedContractorId?: string | null;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  verifiedAt?: string | null;
  verifiedByStaffId?: string | null;
  resolutionSummary?: string | null;
  technicianSignature?: string | null;
  photoEvidenceJson?: string | null;
  merkleAuditHash: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityPartsInventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description?: string | null;
  category: PartCategory;
  quantityOnHand: number;
  quantityReserved: number;
  reorderThreshold: number;
  targetStockLevel: number;
  unitCost: number;
  supplierName?: string | null;
  leadTimeDays: number;
  compatibleEquipmentCategories?: string | null;
  locationBin?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityWorkOrderPartItem {
  id: string;
  workOrderId: string;
  partId: string;
  quantityRequired: number;
  quantityUsed: number;
  unitCostAtTime: number;
  status: WorkOrderPartStatus;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityContractorRegistryItem {
  id: string;
  contractorId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  specializationsJson: string;
  ratePerHour: number;
  slaEmergencyHours: number;
  slaRoutineHours: number;
  performanceRating: number;
  activeInsuranceExpiry?: string | null;
  status: ContractorStatus;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityAuditLogItem {
  id: string;
  auditId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  prevMerkleRoot: string;
  merkleRoot: string;
  timestamp: string;
  institutionId: string;
  createdAt: string;
}
