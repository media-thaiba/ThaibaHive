import { OptimizedRoutePlan } from './fleet-types';

export interface WeatherCondition {
  condition: 'CLEAR' | 'RAIN' | 'HEAVY_STORM' | 'DENSE_FOG';
  precipitationMmPerHour: number;
  visibilityMeters: number;
  windSpeedKmph: number;
  isFloodedRoadWarning: boolean;
}

/**
 * Weather-Aware Route Dispatcher
 * Modifies routing speeds, transit buffers, and avoids hazard zones during severe weather events.
 */
export class WeatherAwareDispatcher {
  /**
   * Adjusts route plan for adverse weather conditions
   */
  public adjustRouteForWeather(route: OptimizedRoutePlan, weather: WeatherCondition): OptimizedRoutePlan {
    let speedPenaltyFactor = 1.0;

    if (weather.condition === 'HEAVY_STORM' || weather.precipitationMmPerHour > 25) {
      speedPenaltyFactor = 1.5; // 50% slower transit
    } else if (weather.condition === 'RAIN' || weather.condition === 'DENSE_FOG') {
      speedPenaltyFactor = 1.25; // 25% slower transit
    }

    const adjustedDuration = Math.round(route.totalDurationMinutes * speedPenaltyFactor);
    const isRerouted = weather.isFloodedRoadWarning || weather.condition === 'HEAVY_STORM';

    return {
      ...route,
      totalDurationMinutes: adjustedDuration,
      status: isRerouted ? 'REROUTED' : route.status,
    };
  }
}
