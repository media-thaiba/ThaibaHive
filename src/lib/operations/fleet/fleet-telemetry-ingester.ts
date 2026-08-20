import { VehicleTelemetry } from './fleet-types';

/**
 * Real-Time Campus Vehicle Fleet Telemetry Ingester
 */
export class FleetTelemetryIngester {
  private activeTelemetry: Map<string, VehicleTelemetry> = new Map();

  public ingest(telemetry: VehicleTelemetry): VehicleTelemetry {
    this.activeTelemetry.set(telemetry.vehicleId, {
      ...telemetry,
      timestamp: telemetry.timestamp || new Date().toISOString(),
    });
    return telemetry;
  }

  public getVehicleTelemetry(vehicleId: string): VehicleTelemetry | undefined {
    return this.activeTelemetry.get(vehicleId);
  }

  public getCampusFleet(campusId: string): VehicleTelemetry[] {
    return Array.from(this.activeTelemetry.values()).filter((v) => v.campusId === campusId);
  }
}
