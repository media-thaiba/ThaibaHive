import { TripwireGeometry, Point2D, LineSegment2D } from './tripwire-geometry';
import { TripwireCrossingEvent } from '../vision-types';

export interface PerimeterZoneConfig {
  zoneId: string;
  cameraId: string;
  name: string;
  tripwire: LineSegment2D;
  allowedDirection: 'entry' | 'exit' | 'bidirectional';
  sensitivity: number;
}

export class PerimeterIntrusionEngine {
  private zones: Map<string, PerimeterZoneConfig> = new Map();

  public registerZone(config: PerimeterZoneConfig): void {
    this.zones.set(config.zoneId, config);
  }

  public evaluateMovement(
    zoneId: string,
    trackId: string,
    from: Point2D,
    to: Point2D
  ): TripwireCrossingEvent | null {
    const zone = this.zones.get(zoneId);
    if (!zone) return null;

    const movementSeg: LineSegment2D = { p1: from, p2: to };
    const intersects = TripwireGeometry.doesLineIntersect(movementSeg, zone.tripwire);

    if (!intersects) return null;

    const actualDirection = TripwireGeometry.getCrossingDirection(zone.tripwire, from, to);

    // If zone is unidirectional (e.g. entry-only violation) and actual direction matches violation
    const isViolation =
      zone.allowedDirection === 'bidirectional' ||
      zone.allowedDirection === actualDirection;

    if (!isViolation) return null;

    return {
      zoneId,
      cameraId: zone.cameraId,
      trackId,
      direction: actualDirection,
      crossingPoint: {
        x: Number(((from.x + to.x) / 2).toFixed(2)),
        y: Number(((from.y + to.y) / 2).toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
