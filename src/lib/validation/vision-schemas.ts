import { z } from 'zod';

export const cameraCreateSchema = z.object({
  cameraId: z.string().min(1),
  name: z.string().min(1),
  facilityId: z.string().min(1),
  spaceId: z.string().optional(),
  zoneType: z.enum(['perimeter', 'corridor', 'entrance', 'parking', 'hallway', 'common_area']).default('perimeter'),
  protocol: z.enum(['onvif', 'rtsp', 'webrtc']).default('onvif'),
  streamUrl: z.string().min(1),
  resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
  fps: z.number().int().min(1).max(60).default(30),
  fovHorizontalDeg: z.number().min(10).max(180).default(90.0),
  fovVerticalDeg: z.number().min(10).max(180).default(60.0),
  mountingHeightMeters: z.number().min(0.5).max(50).default(3.5),
  positionX: z.number().default(0.0),
  positionY: z.number().default(0.0),
  positionZ: z.number().default(3.5),
  pitchDeg: z.number().min(-90).max(90).default(-15.0),
  yawDeg: z.number().min(-180).max(180).default(0.0),
  rollDeg: z.number().min(-180).max(180).default(0.0),
  ptzCapable: z.boolean().default(false),
  status: z.enum(['online', 'offline', 'degraded', 'occluded']).default('online'),
  isPrivacyMasked: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const detectionZoneCreateSchema = z.object({
  zoneId: z.string().min(1),
  cameraId: z.string().min(1),
  name: z.string().min(1),
  zoneType: z.enum(['perimeter_tripwire', 'crowd_density', 'restricted_entry', 'slip_fall_hazard', 'privacy_exclusion']).default('perimeter_tripwire'),
  polygonCoordinatesJson: z.string().default('[]'),
  direction: z.enum(['entry', 'exit', 'bidirectional']).default('bidirectional'),
  sensitivity: z.number().min(0).max(1).default(0.85),
  maxOccupancyThreshold: z.number().int().min(1).default(50),
  loiteringThresholdSeconds: z.number().int().min(5).default(120),
  isActive: z.boolean().default(true),
  institutionId: z.string().default('global'),
});

export const threatAlertCreateSchema = z.object({
  alertId: z.string().optional(),
  cameraId: z.string().min(1),
  zoneId: z.string().optional(),
  threatType: z.enum([
    'perimeter_intrusion',
    'crowd_surge',
    'stampede_risk',
    'slip_and_fall',
    'loitering',
    'camera_tampering',
    'blacklisted_vehicle',
    'unresponsive_person',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']).default('medium'),
  confidenceScore: z.number().min(0).max(1).default(0.85),
  boundingPolygonJson: z.string().default('[]'),
  snapshotUrl: z.string().optional(),
  status: z.enum(['active', 'acknowledged', 'triaged', 'dispatched', 'resolved', 'false_positive']).default('active'),
  facilityId: z.string().min(1),
  spaceId: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const incidentUpdateSchema = z.object({
  status: z.enum(['open', 'investigating', 'dispatched', 'contained', 'resolved', 'closed']),
  leadGuardId: z.string().optional(),
  notes: z.string().optional(),
});

export const guardProfileCreateSchema = z.object({
  guardId: z.string().min(1),
  staffId: z.string().min(1),
  badgeNumber: z.string().min(1),
  callSign: z.string().min(1),
  status: z.enum(['on_duty', 'patrolling', 'dispatched', 'on_break', 'off_duty']).default('on_duty'),
  currentLocationX: z.number().default(0.0),
  currentLocationY: z.number().default(0.0),
  currentLocationZ: z.number().default(0.0),
  currentFacilityId: z.string().optional(),
  assignedSector: z.string().optional(),
  batteryPercent: z.number().min(0).max(100).default(100.0),
  institutionId: z.string().default('global'),
});

export const alprIngestSchema = z.object({
  cameraId: z.string().min(1),
  plateNumber: z.string().min(1),
  confidenceScore: z.number().min(0).max(1).default(0.95),
  direction: z.enum(['entry', 'exit']).default('entry'),
  gateId: z.string().default('main_gate'),
  vehicleType: z.enum(['car', 'motorcycle', 'bus', 'van', 'truck']).default('car'),
  facilityId: z.string().min(1),
  institutionId: z.string().default('global'),
});

export const vehicleWhitelistCreateSchema = z.object({
  permitId: z.string().min(1),
  plateNumber: z.string().min(1),
  ownerName: z.string().min(1),
  ownerType: z.enum(['staff', 'student', 'vendor', 'vip', 'security']).default('staff'),
  ownerId: z.string().optional(),
  vehicleMakeModel: z.string().optional(),
  vehicleColor: z.string().optional(),
  validFrom: z.string().min(1),
  validTo: z.string().optional(),
  isBlacklisted: z.boolean().default(false),
  blacklistReason: z.string().optional(),
  status: z.enum(['active', 'suspended', 'expired']).default('active'),
  institutionId: z.string().default('global'),
});

export const lockdownTriggerSchema = z.object({
  scope: z.enum(['campus_wide', 'facility', 'zone', 'floor']).default('campus_wide'),
  targetFacilityId: z.string().optional(),
  targetZoneId: z.string().optional(),
  reason: z.string().min(1),
  triggerEcoMeshIslanding: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const privacyConsentSchema = z.object({
  userId: z.string().min(1),
  userType: z.enum(['student', 'staff', 'visitor']).default('student'),
  hasConsentedSurveillance: z.boolean().default(true),
  hasConsentedFacialAuth: z.boolean().default(false),
  optedOutZoneIds: z.array(z.string()).default([]),
  institutionId: z.string().default('global'),
});
