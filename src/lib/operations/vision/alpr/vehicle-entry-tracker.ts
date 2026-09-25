export interface VehicleSessionRecord {
  plateNumber: string;
  entryTimestamp: number;
  entryGateId: string;
  exitTimestamp?: number;
  exitGateId?: string;
  dwellMinutes?: number;
}

export class VehicleEntryTracker {
  private activeVehicleSessions: Map<string, VehicleSessionRecord> = new Map();

  public recordMovement(
    plateNumber: string,
    direction: 'entry' | 'exit',
    gateId: string,
    timestamp: number = Date.now()
  ): { session: VehicleSessionRecord; dwellMinutes?: number } {
    const key = plateNumber.toUpperCase();

    if (direction === 'entry') {
      const session: VehicleSessionRecord = {
        plateNumber: key,
        entryTimestamp: timestamp,
        entryGateId: gateId,
      };
      this.activeVehicleSessions.set(key, session);
      return { session };
    } else {
      let session = this.activeVehicleSessions.get(key);
      if (!session) {
        // Exit without recorded entry (assume 60m default dwell)
        session = {
          plateNumber: key,
          entryTimestamp: timestamp - 3600000,
          entryGateId: 'unknown',
        };
      }
      session.exitTimestamp = timestamp;
      session.exitGateId = gateId;
      session.dwellMinutes = Math.max(1, Math.round((timestamp - session.entryTimestamp) / 60000));

      this.activeVehicleSessions.delete(key);
      return { session, dwellMinutes: session.dwellMinutes };
    }
  }

  public getActiveVehicleCount(): number {
    return this.activeVehicleSessions.size;
  }

  public isVehicleOnCampus(plateNumber: string): boolean {
    return this.activeVehicleSessions.has(plateNumber.toUpperCase());
  }
}
