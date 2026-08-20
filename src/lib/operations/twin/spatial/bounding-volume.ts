import { Point3D, BoundingBox3D, Polygon2D, SpatialDimensions } from '../twin-types';

export class BoundingVolume {
  public static containsPoint(box: BoundingBox3D, point: Point3D): boolean {
    return (
      point.x >= box.min.x &&
      point.x <= box.max.x &&
      point.y >= box.min.y &&
      point.y <= box.max.y &&
      point.z >= box.min.z &&
      point.z <= box.max.z
    );
  }

  public static intersects(a: BoundingBox3D, b: BoundingBox3D): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    );
  }

  public static dimensionsToBoundingBox(dim: SpatialDimensions): BoundingBox3D {
    return {
      min: {
        x: dim.x,
        y: dim.y,
        z: dim.z,
      },
      max: {
        x: dim.x + dim.width,
        y: dim.y + dim.height,
        z: dim.z + dim.depth,
      },
    };
  }

  public static euclideanDistance3D(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public static manhattanDistance3D(p1: Point3D, p2: Point3D): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) + Math.abs(p1.z - p2.z);
  }

  /**
   * Ray-casting algorithm for 2D polygon containment test.
   * Returns true if point (x, y) is inside polygon.
   */
  public static isPointInPolygon(polygon: Polygon2D, x: number, y: number): boolean {
    const points = polygon.points;
    if (!points || points.length < 3) return false;

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];

      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }
}
