import { WeatherAwareDispatcher, WeatherCondition } from '@/lib/operations/fleet/weather-aware-dispatcher';
import { OptimizedRoutePlan } from '@/lib/operations/fleet/fleet-types';

describe('AIMS-009 — WeatherAwareDispatcher', () => {
  it('should extend transit duration and flag rerouted status during severe storms', () => {
    const dispatcher = new WeatherAwareDispatcher();

    const baseRoute: OptimizedRoutePlan = {
      routeId: 'route_101',
      vehicleId: 'shuttle_1',
      campusId: 'campus_main',
      stops: [],
      totalDistanceKm: 10,
      totalDurationMinutes: 30,
      fuelEfficiencyKmPerLiter: 12,
      projectedCo2EmissionsKg: 1.9,
      status: 'SCHEDULED',
      generatedAt: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const storm: WeatherCondition = {
      condition: 'HEAVY_STORM',
      precipitationMmPerHour: 35,
      visibilityMeters: 200,
      windSpeedKmph: 55,
      isFloodedRoadWarning: true,
    };

    const adjusted = dispatcher.adjustRouteForWeather(baseRoute, storm);

    expect(adjusted.totalDurationMinutes).toBe(45); // 30 * 1.5 = 45 min
    expect(adjusted.status).toBe('REROUTED');
  });
});
