import { ZoneOccupancyForecast } from './energy-types';

export interface ScheduleEvent {
  zoneId: string;
  eventName: string;
  expectedAttendance: number;
  maxCapacity: number;
  startTime: string; // ISO
  endTime: string; // ISO
}

/**
 * Campus Zone Occupancy Forecasting Engine
 * Forecasts occupancy headcounts across 15-min, 1-hour, and 24-hour time horizons.
 */
export class OccupancyForecaster {
  private schedules: ScheduleEvent[] = [];

  public registerSchedule(event: ScheduleEvent): void {
    this.schedules.push(event);
  }

  /**
   * Forecasts zone occupancy based on calendar schedules, current Wi-Fi/badge count, and historical time-of-day curves
   */
  public forecastOccupancy(
    campusId: string,
    buildingId: string,
    zoneId: string,
    targetTimestamp: Date,
    horizonMinutes: 15 | 60 | 1440 = 15,
    liveBadgeCount?: number
  ): ZoneOccupancyForecast {
    const targetIso = targetTimestamp.toISOString();

    // Check calendar event active at targetTimestamp
    const activeEvent = this.schedules.find(
      (s) =>
        s.zoneId === zoneId &&
        new Date(s.startTime) <= targetTimestamp &&
        new Date(s.endTime) >= targetTimestamp
    );

    let baselineHeadcount = 0;
    const maxCapacity = activeEvent ? activeEvent.maxCapacity : 50;

    if (activeEvent) {
      baselineHeadcount = activeEvent.expectedAttendance;
    } else {
      // Historical time-of-day heuristic (8 AM - 6 PM peak)
      const hour = targetTimestamp.getHours();
      if (hour >= 8 && hour <= 18) {
        baselineHeadcount = Math.floor(maxCapacity * 0.4);
      } else {
        baselineHeadcount = Math.floor(maxCapacity * 0.05);
      }
    }

    if (liveBadgeCount !== undefined && horizonMinutes === 15) {
      // 15-minute horizon heavily weights live sensor telemetry
      baselineHeadcount = Math.round(0.7 * liveBadgeCount + 0.3 * baselineHeadcount);
    }

    const predicted = Math.min(maxCapacity, Math.max(0, baselineHeadcount));
    const lower = Math.max(0, Math.floor(predicted * 0.85));
    const upper = Math.min(maxCapacity, Math.ceil(predicted * 1.15));

    return {
      campusId,
      buildingId,
      zoneId,
      forecastTimestamp: targetIso,
      horizonMinutes,
      predictedHeadcount: predicted,
      confidenceInterval: [lower, upper],
      occupancyRatio: Number((predicted / maxCapacity).toFixed(3)),
      activeCalendarEvent: activeEvent?.eventName,
    };
  }
}
