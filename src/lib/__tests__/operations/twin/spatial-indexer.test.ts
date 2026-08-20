import { SpatialIndexer } from '../../../operations/twin/spatial/spatial-indexer';
import { BoundingVolume } from '../../../operations/twin/spatial/bounding-volume';

describe('Spatial Indexer & Bounding Volume Hierarchy', () => {
  let indexer: SpatialIndexer;

  beforeEach(() => {
    indexer = new SpatialIndexer();
  });

  it('should calculate 3D Euclidean and Manhattan distances accurately', () => {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 3, y: 4, z: 0 };
    expect(BoundingVolume.euclideanDistance3D(p1, p2)).toBe(5);
    expect(BoundingVolume.manhattanDistance3D(p1, p2)).toBe(7);
  });

  it('should test point in polygon containment with ray-casting', () => {
    const polygon = {
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ] as [number, number][],
    };

    expect(BoundingVolume.isPointInPolygon(polygon, 5, 5)).toBe(true);
    expect(BoundingVolume.isPointInPolygon(polygon, 15, 5)).toBe(false);
    expect(BoundingVolume.isPointInPolygon(polygon, -1, -1)).toBe(false);
  });

  it('should index 3D spaces and resolve space containing coordinate in O(log N) time', () => {
    indexer.indexSpace('ROOM-101', 'FAC-A', 1, {
      x: 0,
      y: 0,
      z: 3.5,
      width: 10,
      height: 10,
      depth: 3.5,
    });

    indexer.indexSpace('ROOM-102', 'FAC-A', 1, {
      x: 10,
      y: 0,
      z: 3.5,
      width: 10,
      height: 10,
      depth: 3.5,
    });

    indexer.indexSpace('ROOM-201', 'FAC-A', 2, {
      x: 0,
      y: 0,
      z: 7.0,
      width: 10,
      height: 10,
      depth: 3.5,
    });

    const found101 = indexer.findSpaceAtCoordinate({ x: 5, y: 5, z: 5.0 });
    expect(found101?.spaceId).toBe('ROOM-101');

    const found102 = indexer.findSpaceAtCoordinate({ x: 15, y: 5, z: 5.0 });
    expect(found102?.spaceId).toBe('ROOM-102');

    const found201 = indexer.findSpaceAtCoordinate({ x: 5, y: 5, z: 8.0 });
    expect(found201?.spaceId).toBe('ROOM-201');

    const foundOutside = indexer.findSpaceAtCoordinate({ x: 50, y: 50, z: 5.0 });
    expect(foundOutside).toBeNull();
  });

  it('should query spaces within a given radius', () => {
    indexer.indexSpace('LAB-A', 'FAC-A', 1, {
      x: 0,
      y: 0,
      z: 0,
      width: 4,
      height: 4,
      depth: 3,
    });

    indexer.indexSpace('LAB-B', 'FAC-A', 1, {
      x: 6,
      y: 0,
      z: 0,
      width: 4,
      height: 4,
      depth: 3,
    });

    indexer.indexSpace('FAR-LAB', 'FAC-A', 1, {
      x: 100,
      y: 100,
      z: 0,
      width: 4,
      height: 4,
      depth: 3,
    });

    const nearby = indexer.findSpacesInRadius({ x: 0, y: 0, z: 0 }, 15);
    expect(nearby.length).toBe(2);
    expect(nearby.map((n) => n.spaceId).sort()).toEqual(['LAB-A', 'LAB-B']);
  });

  it('should convert floor level to Z coordinate and back', () => {
    expect(indexer.floorLevelToZ(3, 3.5)).toBe(10.5);
    expect(indexer.zToFloorLevel(11.0, 3.5)).toBe(3);
    expect(indexer.zToFloorLevel(-3.5, 3.5)).toBe(-1);
  });
});
