import { z } from 'zod';

export const facilityCreateSchema = z.object({
  facilityId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  facilityType: z.enum(['academic', 'residential', 'administrative', 'recreational', 'laboratory']).default('academic'),
  status: z.enum(['operational', 'maintenance', 'evacuating', 'closed']).default('operational'),
  totalFloors: z.number().int().min(1).default(1),
  totalAreaSqMeters: z.number().min(0).default(0),
  geoLocationJson: z.string().default('{}'),
  institutionId: z.string().default('global'),
});

export const spaceCreateSchema = z.object({
  spaceId: z.string().min(1),
  facilityId: z.string().min(1),
  floorLevel: z.number().int().default(0),
  name: z.string().min(1),
  code: z.string().min(1),
  spaceType: z.enum(['classroom', 'laboratory', 'office', 'auditorium', 'study_room', 'corridor', 'utility']).default('classroom'),
  capacity: z.number().int().min(1).default(30),
  dimensionsJson: z.string().default('{}'),
  polygonGeoJson: z.string().default('{}'),
  isBookable: z.boolean().default(true),
  status: z.enum(['available', 'occupied', 'reserved', 'hazard_restricted', 'maintenance']).default('available'),
  institutionId: z.string().default('global'),
});

export const spaceUpdateSchema = z.object({
  name: z.string().optional(),
  capacity: z.number().int().optional(),
  currentOccupancy: z.number().int().optional(),
  comfortScore: z.number().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'hazard_restricted', 'maintenance']).optional(),
  isBookable: z.boolean().optional(),
});

export const sensorCreateSchema = z.object({
  sensorId: z.string().min(1),
  facilityId: z.string().min(1),
  spaceId: z.string().optional(),
  sensorType: z.enum(['temperature', 'humidity', 'co2', 'noise', 'occupancy_pir', 'energy_power', 'smoke_fire', 'ble_gateway']).default('temperature'),
  protocol: z.enum(['mqtt', 'coap', 'http_webhook', 'ble_mesh']).default('mqtt'),
  samplingIntervalSeconds: z.number().int().min(1).default(60),
  calibrationOffset: z.number().default(0),
  coordinatesJson: z.string().default('{"x":0,"y":0,"z":0}'),
  institutionId: z.string().default('global'),
});

export const sensorUpdateSchema = z.object({
  status: z.enum(['online', 'offline', 'degraded', 'calibrating']).optional(),
  batteryPercent: z.number().min(0).max(100).optional(),
  calibrationOffset: z.number().optional(),
  samplingIntervalSeconds: z.number().int().optional(),
});

export const telemetryIngestSchema = z.object({
  telemetryId: z.string().optional(),
  sensorId: z.string().min(1),
  facilityId: z.string().min(1),
  spaceId: z.string().optional(),
  metricType: z.enum(['temperature_c', 'humidity_pct', 'co2_ppm', 'noise_db', 'occupancy_count', 'power_kw', 'air_quality_index', 'rssi_dbm']),
  value: z.number(),
  unit: z.string().optional(),
  timestamp: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const telemetryBatchIngestSchema = z.object({
  frames: z.array(telemetryIngestSchema),
  institutionId: z.string().default('global'),
});

export const optimizationPredictSchema = z.object({
  facilityId: z.string().min(1),
  spaceId: z.string().min(1),
  forecastHours: z.number().int().min(1).max(168).default(24),
  enableHvacOptimization: z.boolean().default(true),
  institutionId: z.string().default('global'),
});

export const wayfindingRouteSchema = z.object({
  facilityId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  requireStepFree: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const assetCreateSchema = z.object({
  assetId: z.string().min(1),
  facilityId: z.string().min(1),
  spaceId: z.string().optional(),
  tagId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['lab_equipment', 'it_hardware', 'av_multimedia', 'furniture', 'medical_device', 'fleet_vehicle']).default('lab_equipment'),
  purchaseCost: z.number().min(0).default(0),
  operationalHours: z.number().min(0).default(0),
  warrantyExpiry: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const emergencySimulateSchema = z.object({
  facilityId: z.string().min(1),
  hazardType: z.enum(['none', 'smoke', 'fire', 'construction', 'flooded']).default('fire'),
  blockedNodeIds: z.array(z.string()).default([]),
  blockedEdgeIds: z.array(z.string()).default([]),
  headcountsPerNode: z.record(z.string(), z.number()).default({}),
  institutionId: z.string().default('global'),
});
