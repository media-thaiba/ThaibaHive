import { VehicleRoutingEngine } from '@/lib/operations/fleet/vehicle-routing-engine';
import { VehicleTelemetry, RouteStop } from '@/lib/operations/fleet/fleet-types';

describe('AIMS-007 — VehicleRoutingEngine', () => {
  it('should calculate optimized multi-stop routes minimizing transit distance', () => {
    const engine = new VehicleRoutingEngine();

    const vehicle: VehicleTelemetry = {
      vehicleId: 'shuttle_1',
      campusId: 'campus_main',
      vehicleType: 'SHUTTLE_BUS',
      latitude: 12.971,
      longitude: 77.594,
      speedKmph: 0,
      odometerKm: 12000,
      batterySoCRatio: 0.9,
      engineTempCelsius: 85,
      brakePadWearPercent: 15,
      tirePressurePsi: 33,
      passengerCount: 0,
      maxCapacity: 30,
      status: 'IDLE',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const stops: RouteStop[] = [
      {
        stopId: 'stop_library',
        name: 'Central Library',
        latitude: 12.975,
        longitude: 77.598,
        estimatedArrivalIso: new Date().toISOString(),
        demandPickupCount: 8,
        dropoffCount: 0,
      },
      {
        stopId: 'stop_hostel',
        name: 'North Hostel',
        latitude: 12.972,
        longitude: 77.595,
        estimatedArrivalIso: new Date().toISOString(),
        demandPickupCount: 15,
        dropoffCount: 0,
      },
      {
        stopId: 'stop_sports',
        name: 'Sports Complex',
        latitude: 12.980,
        longitude: 77.602,
        estimatedArrivalIso: new Date().toISOString(),
        demandPickupCount: 5,
        dropoffCount: 0,
      },
    ];

    const plan = engine.optimizeRoute(vehicle, stops);

    expect(plan.stops.length).toBe(3);
    // Nearest to start (12.971, 77.594) is North Hostel (12.972, 77.595)
    expect(plan.stops[0].stopId).toBe('stop_hostel');
    expect(plan.totalDistanceKm).toBeGreaterThan(0);
    expect(plan.totalDurationMinutes).toBeGreaterThan(0);
    expect(plan.projectedCo2EmissionsKg).toBeGreaterThan(0);
  });
});
