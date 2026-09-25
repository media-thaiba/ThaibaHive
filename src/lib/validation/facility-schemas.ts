import { z } from 'zod';

export const equipmentCreateSchema = z.object({
  assetTag: z.string().min(2),
  name: z.string().min(2),
  category: z.enum(['hvac', 'elevator', 'plumbing', 'electrical', 'generator', 'fire_safety']).default('hvac'),
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  roomId: z.string().optional().nullable(),
  spatialCoordinatesJson: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  installDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  status: z.enum(['operational', 'degraded', 'offline', 'maintenance']).default('operational'),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  healthScore: z.number().min(0).max(100).default(100.0),
  metadataJson: z.string().optional().nullable(),
  institutionId: z.string().default('global'),
});

export const sensorRegisterSchema = z.object({
  sensorId: z.string().min(2),
  equipmentId: z.string().min(1),
  sensorType: z.enum([
    'temperature',
    'vibration',
    'pressure',
    'flow_rate',
    'power_draw',
    'filter_delta_p',
    'refrigerant_pressure',
    'runtime_hours',
  ]).default('temperature'),
  sensorModel: z.string().optional().nullable(),
  protocol: z.enum(['mqtt', 'modbus', 'bacnet', 'rest']).default('mqtt'),
  endpointUrl: z.string().optional().nullable(),
  pollingIntervalSec: z.number().int().positive().default(60),
  unit: z.string().default('celsius'),
  minThreshold: z.number().optional().nullable(),
  maxThreshold: z.number().optional().nullable(),
  deadbandPercent: z.number().min(0).max(50).default(1.5),
  institutionId: z.string().default('global'),
});

export const telemetryPacketSchema = z.object({
  protocol: z.enum(['mqtt', 'modbus', 'bacnet', 'rest']).default('rest'),
  sensorId: z.string().min(1),
  equipmentId: z.string().optional(),
  timestamp: z.string().optional(),
  payload: z.union([z.record(z.string(), z.any()), z.number(), z.string()]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const telemetryBatchSchema = z.object({
  packets: z.array(telemetryPacketSchema).min(1),
  institutionId: z.string().default('global'),
});

export const anomalyAlertTriageSchema = z.object({
  alertId: z.string().min(1),
  status: z.enum(['open', 'acknowledged', 'triaged', 'work_order_created', 'resolved', 'false_positive']),
  notes: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const workOrderCreateSchema = z.object({
  workOrderNumber: z.string().optional(),
  title: z.string().min(3),
  description: z.string().optional().default(''),
  priority: z.enum(['emergency', 'urgent', 'routine', 'preventive']).default('routine'),
  category: z.enum(['electrical', 'hvac', 'plumbing', 'mechanical', 'elevator', 'general']).default('general'),
  equipmentId: z.string().optional().nullable(),
  anomalyAlertId: z.string().optional().nullable(),
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  roomId: z.string().optional().nullable(),
  assignedTechnicianId: z.string().optional().nullable(),
  assignedContractorId: z.string().optional().nullable(),
  estimatedDurationMinutes: z.number().int().positive().default(60),
  institutionId: z.string().default('global'),
});

export const workOrderTransitionSchema = z.object({
  workOrderNumber: z.string().min(1),
  fromStatus: z.enum(['draft', 'scheduled', 'assigned', 'in_progress', 'pending_parts', 'completed', 'verified', 'cancelled']),
  toStatus: z.enum(['draft', 'scheduled', 'assigned', 'in_progress', 'pending_parts', 'completed', 'verified', 'cancelled']),
  notes: z.string().optional(),
  technicianSignature: z.string().optional(),
  actualDurationMinutes: z.number().int().positive().optional(),
  consumedParts: z.array(z.object({ partNumber: z.string(), quantity: z.number().int().positive() })).optional(),
  institutionId: z.string().default('global'),
});

export const partsReservationSchema = z.object({
  requests: z.array(z.object({
    workOrderId: z.string().min(1),
    partNumber: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  institutionId: z.string().default('global'),
});

export const contractorRegisterSchema = z.object({
  contractorId: z.string().min(2),
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  specializations: z.array(z.string()).min(1),
  ratePerHour: z.number().positive().default(75.0),
  slaEmergencyHours: z.number().int().positive().default(2),
  slaRoutineHours: z.number().int().positive().default(24),
  performanceRating: z.number().min(1).max(5).default(5.0),
  institutionId: z.string().default('global'),
});
