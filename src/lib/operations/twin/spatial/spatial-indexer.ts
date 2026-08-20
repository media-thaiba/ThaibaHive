import { Point3D, BoundingBox3D, Polygon2D, SpatialDimensions } from '../twin-types';
import { BoundingVolume } from './bounding-volume';

export interface IndexedSpaceNode {
  spaceId: string;
  facilityId: string;
  floorLevel: number;
  boundingBox: BoundingBox3D;
  polygon?: Polygon2D;
  metadata?: Record<string, any>;
}

export class OctreeNode {
  public boundary: BoundingBox3D;
  public capacity: number;
  public spaces: IndexedSpaceNode[] = [];
  public divided: boolean = false;
  public children: OctreeNode[] = [];

  constructor(boundary: BoundingBox3D, capacity: number = 8) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  public subdivide(): void {
    const min = this.boundary.min;
    const max = this.boundary.max;
    const midX = (min.x + max.x) / 2;
    const midY = (min.y + max.y) / 2;
    const midZ = (min.z + max.z) / 2;

    const corners: BoundingBox3D[] = [
      { min: { x: min.x, y: min.y, z: min.z }, max: { x: midX, y: midY, z: midZ } },
      { min: { x: midX, y: min.y, z: min.z }, max: { x: max.x, y: midY, z: midZ } },
      { min: { x: min.x, y: midY, z: min.z }, max: { x: midX, y: max.y, z: midZ } },
      { min: { x: midX, y: midY, z: min.z }, max: { x: max.x, y: max.y, z: midZ } },
      { min: { x: min.x, y: min.y, z: midZ }, max: { x: midX, y: midY, z: max.z } },
      { min: { x: midX, y: min.y, z: midZ }, max: { x: max.x, y: midY, z: max.z } },
      { min: { x: min.x, y: midY, z: midZ }, max: { x: midX, y: max.y, z: max.z } },
      { min: { x: midX, y: midY, z: midZ }, max: { x: max.x, y: max.y, z: max.z } },
    ];

    this.children = corners.map((c) => new OctreeNode(c, this.capacity));
    this.divided = true;
  }

  public insert(space: IndexedSpaceNode): boolean {
    if (!BoundingVolume.intersects(this.boundary, space.boundingBox)) {
      return false;
    }

    if (this.spaces.length < this.capacity && !this.divided) {
      this.spaces.push(space);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
      const existing = [...this.spaces];
      this.spaces = [];
      for (const item of existing) {
        for (const child of this.children) {
          child.insert(item);
        }
      }
    }

    let inserted = false;
    for (const child of this.children) {
      if (child.insert(space)) inserted = true;
    }
    return inserted;
  }

  public queryPoint(point: Point3D, found: Set<IndexedSpaceNode>): void {
    if (!BoundingVolume.containsPoint(this.boundary, point)) {
      return;
    }

    for (const space of this.spaces) {
      if (BoundingVolume.containsPoint(space.boundingBox, point)) {
        if (space.polygon) {
          if (BoundingVolume.isPointInPolygon(space.polygon, point.x, point.y)) {
            found.add(space);
          }
        } else {
          found.add(space);
        }
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.queryPoint(point, found);
      }
    }
  }

  public queryRadius(center: Point3D, radius: number, found: Set<IndexedSpaceNode>): void {
    const searchBox: BoundingBox3D = {
      min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
      max: { x: center.x + radius, y: center.y + radius, z: center.z + radius },
    };

    if (!BoundingVolume.intersects(this.boundary, searchBox)) {
      return;
    }

    for (const space of this.spaces) {
      const spaceCenter: Point3D = {
        x: (space.boundingBox.min.x + space.boundingBox.max.x) / 2,
        y: (space.boundingBox.min.y + space.boundingBox.max.y) / 2,
        z: (space.boundingBox.min.z + space.boundingBox.max.z) / 2,
      };
      if (BoundingVolume.euclideanDistance3D(center, spaceCenter) <= radius) {
        found.add(space);
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.queryRadius(center, radius, found);
      }
    }
  }
}

export class SpatialIndexer {
  private root: OctreeNode;
  private spaceLookup: Map<string, IndexedSpaceNode> = new Map();

  constructor(worldBoundary?: BoundingBox3D) {
    const defaultBoundary: BoundingBox3D = worldBoundary || {
      min: { x: -1000, y: -1000, z: -100 },
      max: { x: 1000, y: 1000, z: 500 },
    };
    this.root = new OctreeNode(defaultBoundary, 8);
  }

  public indexSpace(
    spaceId: string,
    facilityId: string,
    floorLevel: number,
    dim: SpatialDimensions,
    polygon?: Polygon2D,
    metadata?: Record<string, any>
  ): void {
    const boundingBox = BoundingVolume.dimensionsToBoundingBox(dim);
    const node: IndexedSpaceNode = {
      spaceId,
      facilityId,
      floorLevel,
      boundingBox,
      polygon,
      metadata,
    };
    this.spaceLookup.set(spaceId, node);
    this.root.insert(node);
  }

  public findSpaceAtCoordinate(point: Point3D): IndexedSpaceNode | null {
    const candidates = new Set<IndexedSpaceNode>();
    this.root.queryPoint(point, candidates);
    if (candidates.size === 0) return null;
    return Array.from(candidates)[0];
  }

  public findSpacesInRadius(center: Point3D, radiusMeters: number): IndexedSpaceNode[] {
    const candidates = new Set<IndexedSpaceNode>();
    this.root.queryRadius(center, radiusMeters, candidates);
    return Array.from(candidates);
  }

  public getSpace(spaceId: string): IndexedSpaceNode | undefined {
    return this.spaceLookup.get(spaceId);
  }

  public floorLevelToZ(floorLevel: number, floorHeightMeters: number = 3.5): number {
    return floorLevel * floorHeightMeters;
  }

  public zToFloorLevel(z: number, floorHeightMeters: number = 3.5): number {
    return Math.floor(z / floorHeightMeters);
  }

  public clear(): void {
    this.spaceLookup.clear();
    this.root = new OctreeNode({
      min: { x: -1000, y: -1000, z: -100 },
      max: { x: 1000, y: 1000, z: 500 },
    }, 8);
  }
}
