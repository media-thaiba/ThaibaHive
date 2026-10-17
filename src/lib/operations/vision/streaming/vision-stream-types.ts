import type {
  ThreatSeverity,
  ThreatType,
  AlertStatus,
  IncidentStatus,
  GuardStatus,
  LockdownScope,
  LockdownStatus,
  AlprDetectionEvent,
} from '../vision-types';

export const VISION_STREAM_TOPICS = [
  'alerts',
  'incidents',
  'guards',
  'alpr',
  'lockdown',
  'cameras',
] as const;

export type VisionStreamTopic = (typeof VISION_STREAM_TOPICS)[number];

export type VisionStreamEventName = VisionStreamTopic | 'heartbeat';

export type VisionConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'mock'
  | 'offline';

export type VisionDetectionClass =
  | 'person'
  | 'vehicle'
  | 'unauthorized_intrusion'
  | 'weapon_detected';

/** Normalized bounding box in 0..1 coordinates relative to the camera frame. */
export interface VisionBoundingBox {
  detectionClass: VisionDetectionClass;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  trackId?: string;
}

export interface VisionAlertEvent {
  alertId: string;
  threatType: ThreatType;
  severity: ThreatSeverity;
  status: AlertStatus;
  cameraId?: string;
  zoneId?: string;
  title?: string;
  description?: string;
  confidence?: number;
  boundingBoxes?: VisionBoundingBox[];
  detectedAt: string;
  institutionId?: string;
}

export type VisionCameraStatus = 'online' | 'degraded' | 'offline' | 'maintenance';

export interface VisionCameraEvent {
  cameraId: string;
  name: string;
  status: VisionCameraStatus;
  zoneType: string;
  fps: number;
  resolution?: string;
  facilityId?: string;
  boundingBoxes?: VisionBoundingBox[];
  recordingActive?: boolean;
  updatedAt: string;
  institutionId?: string;
}

export type GuardResponseStatus =
  | 'standby'
  | 'on_patrol'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'off_duty';

export interface VisionGuardEvent {
  guardId: string;
  name: string;
  status: GuardResponseStatus | GuardStatus;
  position: { x: number; y: number };
  batteryLevel: number;
  assignedIncidentId?: string | null;
  etaMinutes?: number | null;
  lastHeartbeatAt: string;
  institutionId?: string;
}

export interface VisionIncidentEvent {
  incidentId: string;
  title: string;
  severity: ThreatSeverity;
  status: IncidentStatus;
  zoneId?: string;
  assignedGuardId?: string | null;
  updatedAt: string;
  institutionId?: string;
}

export type AlprVerdict =
  | 'PERMITTED'
  | 'VISITOR_PASS'
  | 'FLAGGED_WATCHLIST'
  | 'VERIFICATION_REQUIRED'
  | 'DENIED';

export interface VisionAlprEvent extends AlprDetectionEvent {
  verdict?: AlprVerdict;
  vehicleMake?: string;
  vehicleModel?: string;
  plateSnapshotUrl?: string | null;
}

export interface VisionLockdownEvent {
  lockdownId: string;
  status: LockdownStatus;
  scope: LockdownScope;
  triggerReason?: string;
  doorsLockedCount: number;
  doorsTotalCount: number;
  ecoMeshIslanded?: boolean;
  activatedAt?: string;
  updatedAt: string;
  institutionId?: string;
}

export interface VisionHeartbeatEvent {
  ts: string;
  activeClients?: number;
}

export interface VisionStreamEventMap extends Record<VisionStreamTopic, unknown> {
  alerts: VisionAlertEvent;
  incidents: VisionIncidentEvent;
  guards: VisionGuardEvent;
  alpr: VisionAlprEvent;
  lockdown: VisionLockdownEvent;
  cameras: VisionCameraEvent;
  heartbeat: VisionHeartbeatEvent;
}

export interface VisionStreamSnapshot {
  connectionStatus: VisionConnectionStatus;
  liveAlerts: VisionAlertEvent[];
  liveCameras: VisionCameraEvent[];
  liveGuards: VisionGuardEvent[];
  liveAlprEvents: VisionAlprEvent[];
  liveIncidents: VisionIncidentEvent[];
  activeLockdown: VisionLockdownEvent | null;
  lastEventAt: number | null;
}
