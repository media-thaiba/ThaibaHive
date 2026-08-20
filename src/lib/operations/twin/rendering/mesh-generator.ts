import { Polygon2D, Point3D } from '../twin-types';

export interface GeneratedMesh3D {
  vertices: number[]; // Flat array [x0, y0, z0, x1, y1, z1, ...]
  indices: number[];  // Triangle index array [i0, i1, i2, ...]
  normals: number[];  // Normal vectors
  uvs: number[];      // Texture coordinates [u0, v0, ...]
  surfaceAreaSqMeters: number;
  volumeCuMeters: number;
  vertexCount: number;
  triangleCount: number;
}

export class MeshGenerator {
  /**
   * Calculate 2D polygon area using Shoelace formula
   */
  public static calculatePolygonArea(polygon: Polygon2D): number {
    const pts = polygon.points;
    if (!pts || pts.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i][0] * pts[j][1];
      area -= pts[j][0] * pts[i][1];
    }
    return Math.abs(area) / 2.0;
  }

  /**
   * Extrude a 2D floor polygon into a 3D prism room mesh with floor, ceiling, and side walls.
   */
  public static extrudePolygon(
    polygon: Polygon2D,
    baseZ: number = 0,
    height: number = 3.5
  ): GeneratedMesh3D {
    const pts = polygon.points;
    const n = pts.length;
    if (n < 3) {
      throw new Error('Cannot extrude polygon with less than 3 points.');
    }

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // 1. Bottom floor vertices (0 to n-1)
    for (let i = 0; i < n; i++) {
      vertices.push(pts[i][0], pts[i][1], baseZ);
      normals.push(0, 0, -1);
      uvs.push(pts[i][0] / 10, pts[i][1] / 10);
    }

    // 2. Top ceiling vertices (n to 2n-1)
    for (let i = 0; i < n; i++) {
      vertices.push(pts[i][0], pts[i][1], baseZ + height);
      normals.push(0, 0, 1);
      uvs.push(pts[i][0] / 10, pts[i][1] / 10);
    }

    // Triangulate floor (fan from vertex 0)
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i + 1, i); // Clockwise for bottom
    }

    // Triangulate ceiling (fan from vertex n)
    for (let i = 1; i < n - 1; i++) {
      indices.push(n, n + i, n + i + 1); // Counter-clockwise for top
    }

    // 3. Side wall quads
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;

      const v0 = i;
      const v1 = j;
      const v2 = n + j;
      const v3 = n + i;

      // Triangle 1
      indices.push(v0, v1, v2);
      // Triangle 2
      indices.push(v0, v2, v3);
    }

    const floorArea = this.calculatePolygonArea(polygon);
    const volume = floorArea * height;

    return {
      vertices,
      indices,
      normals,
      uvs,
      surfaceAreaSqMeters: Number(floorArea.toFixed(2)),
      volumeCuMeters: Number(volume.toFixed(2)),
      vertexCount: vertices.length / 3,
      triangleCount: indices.length / 3,
    };
  }

  /**
   * Generate simple box mesh from dimensions
   */
  public static generateBoxMesh(
    width: number,
    depth: number,
    height: number,
    baseZ: number = 0
  ): GeneratedMesh3D {
    const polygon: Polygon2D = {
      points: [
        [0, 0],
        [width, 0],
        [width, depth],
        [0, depth],
      ],
    };
    return this.extrudePolygon(polygon, baseZ, height);
  }
}
