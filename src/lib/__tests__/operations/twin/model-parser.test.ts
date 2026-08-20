import { ModelParser, GeoJsonFeatureCollection } from '../../../operations/twin/rendering/model-parser';
import { MeshGenerator } from '../../../operations/twin/rendering/mesh-generator';

describe('3D Mesh Generator & Model Parser', () => {
  it('should calculate polygon surface area using Shoelace formula', () => {
    const polygon = {
      points: [
        [0, 0],
        [10, 0],
        [10, 5],
        [0, 5],
      ] as [number, number][],
    };
    const area = MeshGenerator.calculatePolygonArea(polygon);
    expect(area).toBe(50.0);
  });

  it('should extrude 2D polygon into 3D mesh with correct vertices, normals, and volume', () => {
    const polygon = {
      points: [
        [0, 0],
        [10, 0],
        [10, 5],
        [0, 5],
      ] as [number, number][],
    };
    const mesh = MeshGenerator.extrudePolygon(polygon, 0, 3.5);
    expect(mesh.surfaceAreaSqMeters).toBe(50.0);
    expect(mesh.volumeCuMeters).toBe(175.0);
    expect(mesh.vertexCount).toBe(8); // 4 bottom + 4 top
    expect(mesh.triangleCount).toBe(12); // 2 bottom + 2 top + 8 side walls
  });

  it('should parse GeoJSON FeatureCollection into 3D Facility Scene with LODs', () => {
    const geoJson: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            spaceId: 'SPC-L101',
            name: 'Physics Lecture Hall',
            code: 'PHY-101',
            floorLevel: 1,
            spaceType: 'auditorium',
            capacity: 120,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [20, 0],
                [20, 15],
                [0, 15],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            spaceId: 'SPC-L102',
            name: 'Chemistry Lab',
            code: 'CHM-102',
            floorLevel: 1,
            spaceType: 'laboratory',
            capacity: 35,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [20, 0],
                [35, 0],
                [35, 15],
                [20, 15],
                [20, 0],
              ],
            ],
          },
        },
      ],
    };

    const scene = ModelParser.parseGeoJsonFacility('FAC-SCIENCE', geoJson);
    expect(scene.facilityId).toBe('FAC-SCIENCE');
    expect(scene.spaces.length).toBe(2);
    expect(scene.totalAreaSqMeters).toBe(300 + 225); // 20*15 + 15*15 = 525
    expect(scene.spaces[0].meshLod0).toBeDefined();
    expect(scene.spaces[0].meshLod2).toBeDefined();
    expect(scene.sceneBounds.max.x).toBe(35);
  });
});
