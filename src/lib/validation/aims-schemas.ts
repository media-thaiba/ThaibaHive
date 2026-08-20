import { z } from 'zod';

export const hvacOptimizationSchema = z.object({
  campusId: z.string().min(1),
  buildingId: z.string().min(1),
  zoneId: z.string().min(1),
  currentTempCelsius: z.number().min(10).max(40),
  targetTempCelsius: z.number().min(18).max(30).optional(),
});

export const fleetDispatchSchema = z.object({
  vehicleId: z.string().min(1),
  campusId: z.string().min(1),
  stops: z.array(
    z.object({
      stopId: z.string().min(1),
      name: z.string().min(1),
      latitude: z.number(),
      longitude: z.number(),
      demandPickupCount: z.number().min(0).default(0),
    })
  ).min(1),
});

export const biometricAttendanceSchema = z.object({
  campusId: z.string().min(1),
  locationName: z.string().min(1),
  sessionId: z.string().min(1),
  queryEmbedding: z.array(z.number()).min(128),
});

export const cloudRightsizingSchema = z.object({
  resourceId: z.string().min(1),
  targetInstanceType: z.string().min(1),
  action: z.enum(['DOWNSCALE', 'MIGRATE_TO_SPOT', 'TERMINATE_IDLE']),
});

export const resourceBookingSchema = z.object({
  resourceId: z.string().min(1),
  requestingCampusId: z.string().min(1),
  hostCampusId: z.string().min(1),
  startTimeIso: z.string().datetime(),
  endTimeIso: z.string().datetime(),
  unitsReserved: z.number().int().min(1),
});

export const marlOverrideSchema = z.object({
  decisionId: z.string().min(1).optional(),
  action: z.enum(['APPROVE', 'REJECT', 'EMERGENCY_KILL_SWITCH']),
  reason: z.string().optional(),
});
