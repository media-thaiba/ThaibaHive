import type {
  VisionAlertEvent,
  VisionAlprEvent,
  VisionCameraEvent,
  VisionGuardEvent,
  VisionLockdownEvent,
  VisionStreamTopic,
} from './vision-stream-types';

export type VisionMockEmit = (topic: VisionStreamTopic, data: unknown) => void;

export interface VisionMockSimulatorOptions {
  tenantId?: string;
  emit: VisionMockEmit;
  /** Base cadence multiplier; 1 = realtime, 2 = half speed, 0.5 = double speed. */
  speed?: number;
}

const CAMERAS: Array<Pick<VisionCameraEvent, 'cameraId' | 'name' | 'zoneType' | 'resolution'>> = [
  { cameraId: 'cam_gate_01', name: 'Main Campus Gate', zoneType: 'entrance', resolution: '4K' },
  { cameraId: 'cam_quad_02', name: 'Central Science Quad', zoneType: 'common_area', resolution: '1080p' },
  { cameraId: 'cam_dorm_03', name: 'West Residence Perimeter', zoneType: 'perimeter', resolution: '4K' },
  { cameraId: 'cam_park_04', name: 'South Faculty Parking', zoneType: 'parking', resolution: '1080p' },
  { cameraId: 'cam_lab_05', name: 'Chemistry Lab Corridor', zoneType: 'restricted', resolution: '1080p' },
  { cameraId: 'cam_lib_06', name: 'Library Atrium', zoneType: 'common_area', resolution: '1080p' },
  { cameraId: 'cam_gym_07', name: 'Gymnasium East Entrance', zoneType: 'entrance', resolution: '1080p' },
  { cameraId: 'cam_roof_08', name: 'Admin Block Rooftop', zoneType: 'perimeter', resolution: '4K' },
];

const GUARDS = [
  { guardId: 'grd_01', name: 'Officer Reyes' },
  { guardId: 'grd_02', name: 'Officer Adeyemi' },
  { guardId: 'grd_03', name: 'Officer Kowalski' },
  { guardId: 'grd_04', name: 'Officer Tan' },
];

const PERMITTED_PLATES = ['TN-09-AK-4412', 'TN-09-BX-7781', 'KA-05-MJ-2210', 'DL-3C-AZ-9087'];
const VISITOR_PLATES = ['TN-09-VP-1001', 'TN-09-VP-1002', 'TN-09-VP-1003'];
const WATCHLIST_PLATES = ['TN-09-XZ-6666', 'MH-12-BL-0001'];

const THREAT_TYPES = [
  'perimeter_intrusion',
  'crowd_surge',
  'loitering',
  'camera_tampering',
  'unresponsive_person',
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomPlateVerdict(): Pick<
  VisionAlprEvent,
  'plateNumber' | 'verdict' | 'permitStatus' | 'confidence' | 'gateActuated'
> {
  const roll = Math.random();
  if (roll < 0.12) {
    const plate = pick(WATCHLIST_PLATES);
    return {
      plateNumber: plate,
      verdict: 'FLAGGED_WATCHLIST',
      permitStatus: 'FLAGGED_WATCHLIST',
      confidence: rand(88, 99),
      gateActuated: false,
    };
  }
  if (roll < 0.32) {
    return {
      plateNumber: pick(VISITOR_PLATES),
      verdict: 'VISITOR_PASS',
      permitStatus: 'VISITOR_PASS',
      confidence: rand(80, 96),
      gateActuated: true,
    };
  }
  return {
    plateNumber: pick(PERMITTED_PLATES),
    verdict: 'PERMITTED',
    permitStatus: 'PERMITTED',
    confidence: rand(90, 99),
    gateActuated: true,
  };
}

/**
 * VisionMockSimulator — development-only realistic live telemetry generator.
 *
 * Emits typed Vision Stream events (cameras, guards, ALPR, alerts, lockdown)
 * on realistic cadences so the SOC cockpit can be demoed without live
 * camera/ALPR infrastructure. Pure generator: no DOM, no EventSource — the
 * consumer (useVisionStream) decides how to surface the events.
 */
export class VisionMockSimulator {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;
  private readonly tenantId: string;
  private readonly emit: VisionMockEmit;
  private readonly speed: number;
  private lockdownActive = false;

  constructor(options: VisionMockSimulatorOptions) {
    this.tenantId = options.tenantId ?? 'global';
    this.emit = options.emit;
    this.speed = options.speed && options.speed > 0 ? options.speed : 1;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.loop('cameras', 2500, () => this.nextCameraEvent());
    this.loop('guards', 4000, () => this.nextGuardEvent());
    this.loop('alpr', 6000, () => this.nextAlprEvent());
    this.loop('alerts', 12000, () => this.nextAlertEvent());
    this.loop('lockdown', 45000, () => this.nextLockdownEvent());
  }

  public stop(): void {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  public isRunning(): boolean {
    return this.running;
  }

  private loop(topic: VisionStreamTopic, intervalMs: number, produce: () => unknown | null): void {
    if (!this.running) return;
    const jitter = rand(0, Math.floor(intervalMs * 0.25));
    const timer = setTimeout(() => {
      if (!this.running) return;
      const payload = produce();
      if (payload) this.emit(topic, payload);
      this.loop(topic, intervalMs, produce);
    }, (intervalMs + jitter) * this.speed);
    this.timers.push(timer);
  }

  private nextCameraEvent(): VisionCameraEvent {
    const cam = pick(CAMERAS);
    const roll = Math.random();
    const status = roll < 0.85 ? 'online' : roll < 0.95 ? 'degraded' : 'offline';
    return {
      cameraId: cam.cameraId,
      name: cam.name,
      status,
      zoneType: cam.zoneType,
      fps: status === 'online' ? rand(24, 30) : status === 'degraded' ? rand(6, 15) : 0,
      resolution: cam.resolution,
      recordingActive: status !== 'offline',
      updatedAt: nowIso(),
      institutionId: this.tenantId,
    };
  }

  private nextGuardEvent(): VisionGuardEvent {
    const guard = pick(GUARDS);
    const statuses = ['standby', 'on_patrol', 'dispatched', 'en_route'] as const;
    const status = pick(statuses);
    const battery = rand(22, 100);
    return {
      guardId: guard.guardId,
      name: guard.name,
      status,
      position: { x: rand(5, 95), y: rand(5, 95) },
      batteryLevel: battery,
      assignedIncidentId: status === 'dispatched' || status === 'en_route' ? `inc_${rand(1, 9)}` : null,
      etaMinutes: status === 'en_route' ? rand(1, 8) : null,
      lastHeartbeatAt: nowIso(),
      institutionId: this.tenantId,
    };
  }

  private nextAlprEvent(): VisionAlprEvent {
    const verdict = randomPlateVerdict();
    return {
      logId: `alpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cameraId: 'cam_gate_01',
      plateNumber: verdict.plateNumber,
      confidence: verdict.confidence,
      direction: Math.random() < 0.7 ? 'entry' : 'exit',
      gateId: 'gate_main',
      vehicleType: pick(['sedan', 'suv', 'hatchback', 'van']),
      permitStatus: verdict.permitStatus,
      gateActuated: verdict.gateActuated,
      verdict: verdict.verdict,
      timestamp: nowIso(),
    };
  }

  private nextAlertEvent(): VisionAlertEvent {
    const threatType = pick(THREAT_TYPES);
    const severityRoll = Math.random();
    const severity =
      severityRoll < 0.15 ? 'critical' : severityRoll < 0.4 ? 'high' : severityRoll < 0.75 ? 'medium' : 'low';
    const cam = pick(CAMERAS);
    return {
      alertId: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      threatType,
      severity,
      status: 'active',
      cameraId: cam.cameraId,
      title: `${threatType.replace(/_/g, ' ')} detected — ${cam.name}`,
      confidence: rand(62, 98),
      detectedAt: nowIso(),
      institutionId: this.tenantId,
    };
  }

  private nextLockdownEvent(): VisionLockdownEvent | null {
    // Rarely toggles; mostly heartbeats the current (usually clear) state.
    const trigger = !this.lockdownActive && Math.random() < 0.2;
    const clear = this.lockdownActive && Math.random() < 0.5;
    if (!trigger && !clear) return null;
    this.lockdownActive = trigger;
    return {
      lockdownId: `lck_${Date.now()}`,
      status: trigger ? 'active' : 'all_clear',
      scope: pick(['campus_wide', 'facility', 'zone'] as const),
      triggerReason: trigger ? 'Mock exercise — simulated threat response' : undefined,
      doorsLockedCount: trigger ? rand(20, 48) : 0,
      doorsTotalCount: 48,
      ecoMeshIslanded: trigger,
      activatedAt: trigger ? nowIso() : undefined,
      updatedAt: nowIso(),
      institutionId: this.tenantId,
    };
  }
}
