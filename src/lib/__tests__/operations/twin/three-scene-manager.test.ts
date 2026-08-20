import { ThreeSceneManager } from '../../../operations/twin/rendering/three-scene-manager';
import { ModelParser } from '../../../operations/twin/rendering/model-parser';

describe('ThreeSceneManager & 3D Interactive Viewport', () => {
  let manager: ThreeSceneManager;

  beforeEach(() => {
    manager = new ThreeSceneManager();
  });

  it('should initialize and load parsed facility scene', () => {
    const scene = ModelParser.parseGeoJsonFacility('FAC-MAIN', {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { spaceId: 'RM-A', floorLevel: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
          },
        },
        {
          type: 'Feature',
          properties: { spaceId: 'RM-B', floorLevel: 1 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
          },
        },
      ],
    });

    manager.loadFacilityScene(scene);
    expect(manager.getScene()).toBe(scene);

    const camera = manager.getCameraState();
    expect(camera.target.x).toBe(5);
    expect(camera.target.y).toBe(5);
  });

  it('should support floor isolation and exploded floor view offsets', () => {
    const scene = ModelParser.parseGeoJsonFacility('FAC-MAIN', {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { spaceId: 'RM-F0', floorLevel: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
          },
        },
        {
          type: 'Feature',
          properties: { spaceId: 'RM-F1', floorLevel: 1 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
          },
        },
      ],
    });
    manager.loadFacilityScene(scene);

    // Exploded view
    manager.setExplodedViewDistance(15);
    const exploded = manager.getRenderableSpaces();
    expect(exploded.find((s) => s.spaceId === 'RM-F0')?.transformedZ).toBe(0);
    expect(exploded.find((s) => s.spaceId === 'RM-F1')?.transformedZ).toBe(3.5 + 15);

    // Floor isolation
    manager.setIsolatedFloor(1);
    const isolated = manager.getRenderableSpaces();
    expect(isolated.length).toBe(1);
    expect(isolated[0].spaceId).toBe('RM-F1');
  });

  it('should simulate raycast room selection', () => {
    const scene = ModelParser.parseGeoJsonFacility('FAC-MAIN', {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { spaceId: 'TARGET-ROOM', name: 'Target Room', floorLevel: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
          },
        },
      ],
    });
    manager.loadFacilityScene(scene);

    const hit = manager.raycast(
      { x: 15, y: 15, z: 20 },
      { x: 0, y: 0, z: -1 }
    );

    expect(hit.hit).toBe(true);
    expect(hit.spaceId).toBe('TARGET-ROOM');
    expect(hit.intersectionPoint?.z).toBe(3.5);
  });
});
