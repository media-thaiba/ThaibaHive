import { TwinDbStore } from '../../../db/twin-store';
import { SensorStatus } from '../twin-types';

export interface SensorHealthStatus {
  sensorId: string;
  facilityId: string;
  status: SensorStatus;
  batteryPercent: number;
  isStale: boolean;
  secondsSinceLastHeartbeat: number;
  uptimePct: number;
  healthGrade: 'A' | 'B' | 'C' | 'F';
  issues: string[];
}

export class SensorHealthMonitor {
  private dbStore: TwinDbStore;
  private heartbeatRecords: Map<string, number> = new Map(); // sensorId -> unix timestamp ms
  private packetCounts: Map<string, { received: number; expected: number }> = new Map();

  constructor() {
    this.dbStore = TwinDbStore.getInstance();
  }

  public recordHeartbeat(sensorId: string, timestampMs: number = Date.now()): void {
    this.heartbeatRecords.set(sensorId, timestampMs);
    const counts = this.packetCounts.get(sensorId) || { received: 0, expected: 0 };
    counts.received++;
    this.packetCounts.set(sensorId, counts);
  }

  public async evaluateSensorHealth(sensorId: string, tenantId: string = 'global'): Promise<SensorHealthStatus | null> {
    const sensor = await this.dbStore.getSensorById(sensorId, tenantId);
    if (!sensor) return null;

    const now = Date.now();
    const lastHeartbeatMs = this.heartbeatRecords.get(sensorId) || (sensor.lastHeartbeat ? new Date(sensor.lastHeartbeat).getTime() : now - 120000);
    const secondsSinceLastHeartbeat = Math.floor((now - lastHeartbeatMs) / 1000);

    const samplingInterval = sensor.samplingIntervalSeconds || 60;
    const isStale = secondsSinceLastHeartbeat > samplingInterval * 3;

    const battery = sensor.batteryPercent !== undefined ? sensor.batteryPercent : 100;
    const issues: string[] = [];

    let status: SensorStatus = 'online';

    if (isStale) {
      status = 'offline';
      issues.push(`Sensor unresponsive for ${secondsSinceLastHeartbeat}s (exceeds 3x interval of ${samplingInterval}s)`);
    } else if (battery < 20) {
      status = 'degraded';
      issues.push(`Low battery warning (${battery}%)`);
    }

    // Determine health grade
    let healthGrade: 'A' | 'B' | 'C' | 'F' = 'A';
    if (status === 'offline') healthGrade = 'F';
    else if (battery < 15) healthGrade = 'C';
    else if (battery < 50 || status === 'degraded') healthGrade = 'B';

    // Auto-create maintenance order if critical degradation or battery < 10%
    if ((battery <= 10 || status === 'offline') && sensor.status !== 'offline') {
      await this.dbStore.createMaintenanceOrder({
        orderId: `MORD-AUTO-${sensorId}-${Date.now().toString().slice(-4)}`,
        facilityId: sensor.facilityId,
        sensorId: sensor.sensorId,
        title: `Automated Sensor Maintenance: ${sensor.sensorId}`,
        description: `Self-healing monitor flagged sensor ${sensor.sensorId} with status ${status}, battery ${battery}%.`,
        priority: battery <= 10 ? 'high' : 'medium',
        status: 'pending',
        source: 'sensor_alarm',
        institutionId: tenantId,
      });

      // Update sensor status in DB
      await this.dbStore.updateSensor(sensorId, { status }, tenantId);
    }

    return {
      sensorId,
      facilityId: sensor.facilityId,
      status,
      batteryPercent: battery,
      isStale,
      secondsSinceLastHeartbeat,
      uptimePct: status === 'online' ? 99.8 : (status === 'degraded' ? 85.0 : 0.0),
      healthGrade,
      issues,
    };
  }

  public async evaluateAllSensorsInFacility(facilityId: string, tenantId: string = 'global'): Promise<SensorHealthStatus[]> {
    const sensors = await this.dbStore.listSensors(tenantId, facilityId);
    const statuses: SensorHealthStatus[] = [];
    for (const sensor of sensors) {
      const res = await this.evaluateSensorHealth(sensor.sensorId, tenantId);
      if (res) statuses.push(res);
    }
    return statuses;
  }
}
