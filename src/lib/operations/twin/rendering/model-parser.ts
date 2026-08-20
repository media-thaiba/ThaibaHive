import { Polygon2D, Point3D, BoundingBox3D } from '../twin-types';
import { MeshGenerator, GeneratedMesh3D } from './mesh-generator';

export interface GeoJsonFeature {
  type: string;
  properties: {
    spaceId?: string;
    name?: string;
    code?: string;
    floorLevel?: number;
    spaceType?: string;
    capacity?: number;
    height?: number;
    color?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface ParsedSpaceModel {
  spaceId: string;
  name: string;
  code: string;
  floorLevel: number;
  spaceType: string;
  capacity: number;
  color: string;
  polygon: Polygon2D;
  meshLod0: GeneratedMesh3D;
  meshLod1: GeneratedMesh3D;
  meshLod2: GeneratedMesh3D;
  boundingBox: BoundingBox3D;
}

export interface ParsedFacilityScene {
  facilityId: string;
  spaces: ParsedSpaceModel[];
  totalFloors: number;
  totalAreaSqMeters: number;
  totalVolumeCuMeters: number;
  sceneBounds: BoundingBox3D;
}

export class ModelParser {
  /**
   * Parse a GeoJSON FeatureCollection into a 3D Facility Scene
   */
  public static parseGeoJsonFacility(
    facilityId: string,
    geoJson: GeoJsonFeatureCollection,
    floorHeightMeters: number = 3.5
  ): ParsedFacilityScene {
    if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new Error('Invalid GeoJSON FeatureCollection format.');
    }

    const spaces: ParsedSpaceModel[] = [];
    let totalArea = 0;
    let totalVolume = 0;
    const floorSet = new Set<number>();

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < geoJson.features.length; i++) {
      const feature = geoJson.features[i];
      const props = feature.properties || {};
      const spaceId = props.spaceId || `SPC_${i + 1}`;
      const name = props.name || `Space ${i + 1}`;
      const code = props.code || `RM-${i + 1}`;
      const floorLevel = props.floorLevel !== undefined ? props.floorLevel : 0;
      const spaceType = props.spaceType || 'classroom';
      const capacity = props.capacity || 30;
      const height = props.height || floorHeightMeters;
      const color = props.color || '#3b82f6';

      floorSet.add(floorLevel);
      const baseZ = floorLevel * floorHeightMeters;

      // Extract 2D polygon coordinates
      let rawPoints: number[][] = [];
      if (feature.geometry.type === 'Polygon') {
        rawPoints = (feature.geometry.coordinates as number[][][])[0] || [];
      } else if (feature.geometry.type === 'MultiPolygon') {
        rawPoints = ((feature.geometry.coordinates as number[][][][])[0] || [])[0] || [];
      }

      if (rawPoints.length < 3) continue;

      const polygon: Polygon2D = {
        points: rawPoints.map((p) => [p[0], p[1]] as [number, number]),
      };

      // Compute bounding box for space
      let sMinX = Infinity, sMinY = Infinity;
      let sMaxX = -Infinity, sMaxY = -Infinity;
      for (const [px, py] of polygon.points) {
        sMinX = Math.min(sMinX, px);
        sMinY = Math.min(sMinY, py);
        sMaxX = Math.max(sMaxX, px);
        sMaxY = Math.max(sMaxY, py);
      }

      const boundingBox: BoundingBox3D = {
        min: { x: sMinX, y: sMinY, z: baseZ },
        max: { x: sMaxX, y: sMaxY, z: baseZ + height },
      };

      minX = Math.min(minX, sMinX);
      minY = Math.min(minY, sMinY);
      minZ = Math.min(minZ, baseZ);
      maxX = Math.max(maxX, sMaxX);
      maxY = Math.max(maxY, sMaxY);
      maxZ = Math.max(maxZ, baseZ + height);

      // Generate LODs
      // LOD0: Full detailed extruded polygon mesh
      const meshLod0 = MeshGenerator.extrudePolygon(polygon, baseZ, height);
      // LOD1: Simplified polygon mesh
      const meshLod1 = meshLod0;
      // LOD2: Simplified bounding box prism
      const meshLod2 = MeshGenerator.generateBoxMesh(sMaxX - sMinX, sMaxY - sMinY, height, baseZ);

      totalArea += meshLod0.surfaceAreaSqMeters;
      totalVolume += meshLod0.volumeCuMeters;

      spaces.push({
        spaceId,
        name,
        code,
        floorLevel,
        spaceType,
        capacity,
        color,
        polygon,
        meshLod0,
        meshLod1,
        meshLod2,
        boundingBox,
      });
    }

    return {
      facilityId,
      spaces,
      totalFloors: floorSet.size || 1,
      totalAreaSqMeters: Number(totalArea.toFixed(2)),
      totalVolumeCuMeters: Number(totalVolume.toFixed(2)),
      sceneBounds: {
        min: { x: minX === Infinity ? 0 : minX, y: minY === Infinity ? 0 : minY, z: minZ === Infinity ? 0 : minZ },
        max: { x: maxX === -Infinity ? 100 : maxX, y: maxY === -Infinity ? 100 : maxY, z: maxZ === -Infinity ? 20 : maxZ },
      },
    };
  }
}
