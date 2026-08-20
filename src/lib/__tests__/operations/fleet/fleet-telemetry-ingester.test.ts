import { FleetTelemetryIngester } from '@/lib/operations/fleet/fleet-telemetry-ingester';

describe('AIMS-007 — FleetTelemetryIngester', () => {
  it('should ingest and store vehicle telemetry accurately', () => {
    const ingester = new FleetTelemetryIngester();
    const reading = ingester.ingest({
      vehicleId: 'shuttle_01',
      campusId: 'campus_main',
      vehicleType: 'SHUTTLE_BUS',
      latitude: 12.9716,
      longitude: 77.5946,
      speedKmph: 18.5,
      odometerKm: 24500,
      batterySoCRatio: 0.78,
      engineTempCelsius: 88.0,
      brakePadWearPercent: 25,
      tirePressurePsi: 32,
      passengerCount: 12,
      maxCapacity: 25,
      status: 'IN_TRANSIT',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    });

    expect(ingester.getVehicleTelemetry('shuttle_01')?.speedKmph).toBe(18.5);
    expect(ingester.getCampusFleet('campus_main').length).toBe(1);
  });
});
