export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment2D {
  p1: Point2D;
  p2: Point2D;
}

export class TripwireGeometry {
  /**
   * Check if point is inside a polygon using ray casting
   */
  public static isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if movement vector (from -> to) intersects with tripwire line segment
   */
  public static doesLineIntersect(seg1: LineSegment2D, seg2: LineSegment2D): boolean {
    const ccw = (A: Point2D, B: Point2D, C: Point2D) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };

    return (
      ccw(seg1.p1, seg2.p1, seg2.p2) !== ccw(seg1.p2, seg2.p1, seg2.p2) &&
      ccw(seg1.p1, seg1.p2, seg2.p1) !== ccw(seg1.p1, seg1.p2, seg2.p2)
    );
  }

  /**
   * Determine crossing direction relative to tripwire normal vector
   */
  public static getCrossingDirection(
    tripwire: LineSegment2D,
    from: Point2D,
    to: Point2D
  ): 'entry' | 'exit' {
    const tripwireVector = { x: tripwire.p2.x - tripwire.p1.x, y: tripwire.p2.y - tripwire.p1.y };
    // Normal vector perpendicular to tripwire
    const normal = { x: -tripwireVector.y, y: tripwireVector.x };
    const movement = { x: to.x - from.x, y: to.y - from.y };

    const dotProduct = movement.x * normal.x + movement.y * normal.y;
    return dotProduct >= 0 ? 'entry' : 'exit';
  }
}
