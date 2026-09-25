export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type ThreatType =
  | 'perimeter_intrusion'
  | 'crowd_surge'
  | 'stampede_risk'
  | 'slip_and_fall'
  | 'loitering'
  | 'camera_tampering'
  | 'blacklisted_vehicle'
  | 'unresponsive_person';

export type AlertStatus =
  | 'active'
  | 'acknowledged'
  | 'triaged'
  | 'dispatched'
  | 'resolved'
  | 'false_positive';

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'dispatched'
  | 'contained'
  | 'resolved'
  | 'closed';

export type GuardStatus =
  | 'on_duty'
  | 'patrolling'
  | 'dispatched'
  | 'on_break'
  | 'off_duty';

export type DispatchPriority = 'urgent' | 'high' | 'medium' | 'low';

export type DispatchResponseStatus =
  | 'dispatched'
  | 'acknowledged'
  | 'en_route'
  | 'on_scene'
  | 'cleared';

export type LockdownScope = 'campus_wide' | 'facility' | 'zone' | 'floor';

export type LockdownStatus = 'active' | 'all_clear' | 'cancelled';

export interface SpatialCoordinate3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraFrustum {
  cameraId: string;
  horizontalFov: number;
  verticalFov: number;
  mountingHeight: number;
  position: SpatialCoordinate3D;
  orientation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  nearPlane: number;
  farPlane: number;
  vertices3D: SpatialCoordinate3D[];
}

export interface CapAlertPayload {
  identifier: string;
  sender: string;
  sent: string;
  status: 'Actual' | 'Exercise' | 'Draft';
  msgType: 'Alert' | 'Update' | 'Cancel';
  scope: 'Public' | 'Restricted' | 'Private';
  info: {
    category: 'Safety' | 'Security' | 'Rescue' | 'Health' | 'Env';
    event: string;
    urgency: 'Immediate' | 'Expected' | 'Future' | 'Past';
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
    certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely';
    headline: string;
    description: string;
    area: {
      areaDesc: string;
      circle?: string;
      polygon?: string;
    };
  };
}

export interface CrowdDensityMetric {
  zoneId: string;
  cameraId: string;
  personCount: number;
  densityPersonsPerSqMeter: number;
  velocityVector: { vx: number; vy: number };
  turbulenceIndex: number;
  crushRiskScore: number;
  timestamp: string;
}

export interface TripwireCrossingEvent {
  zoneId: string;
  cameraId: string;
  trackId: string;
  direction: 'entry' | 'exit' | 'bidirectional';
  crossingPoint: { x: number; y: number };
  timestamp: string;
}

export interface SlipFallEvent {
  cameraId: string;
  trackId: string;
  verticalVelocity: number;
  aspectRatio: number;
  immobilityDurationSeconds: number;
  confidence: number;
  timestamp: string;
}

export interface AlprDetectionEvent {
  logId: string;
  cameraId: string;
  plateNumber: string;
  confidence: number;
  direction: 'entry' | 'exit';
  gateId: string;
  vehicleType: string;
  permitStatus: string;
  gateActuated: boolean;
  timestamp: string;
}
