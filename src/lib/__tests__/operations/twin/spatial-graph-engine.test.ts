import { SpatialGraphEngine } from '../../../operations/twin/wayfinding/spatial-graph-engine';

describe('Spatial Graph Engine & 3D Wayfinding', () => {
  let graph: SpatialGraphEngine;

  beforeEach(() => {
    graph = new SpatialGraphEngine();
  });

  it('should construct nodes, edges, and find shortest 3D navigation route', () => {
    // Floor 1 Room A
    graph.addNode({ id: 'ROOM-A', floorLevel: 1, coordinates: { x: 0, y: 0, z: 3.5 }, type: 'room_entrance' });
    // Floor 1 Hallway
    graph.addNode({ id: 'HALL-1', floorLevel: 1, coordinates: { x: 10, y: 0, z: 3.5 }, type: 'hallway_intersection' });
    // Floor 1 Stairs
    graph.addNode({ id: 'STAIR-1', floorLevel: 1, coordinates: { x: 20, y: 0, z: 3.5 }, type: 'stairwell', isAccessible: false });
    // Floor 0 Stairs
    graph.addNode({ id: 'STAIR-0', floorLevel: 0, coordinates: { x: 20, y: 0, z: 0 }, type: 'stairwell', isAccessible: false });
    // Floor 0 Exit
    graph.addNode({ id: 'EXIT-GROUND', floorLevel: 0, coordinates: { x: 30, y: 0, z: 0 }, type: 'emergency_exit', isExit: true });

    graph.addEdge({ id: 'E1', source: 'ROOM-A', target: 'HALL-1', distanceMeters: 10 });
    graph.addEdge({ id: 'E2', source: 'HALL-1', target: 'STAIR-1', distanceMeters: 10 });
    graph.addEdge({ id: 'E3', source: 'STAIR-1', target: 'STAIR-0', distanceMeters: 5, isStepFree: false });
    graph.addEdge({ id: 'E4', source: 'STAIR-0', target: 'EXIT-GROUND', distanceMeters: 10 });

    const route = graph.findRoute('FAC-01', 'ROOM-A', 'EXIT-GROUND');
    expect(route).toBeDefined();
    expect(route?.pathNodes.length).toBe(5);
    expect(route?.totalDistanceMeters).toBe(35);
    expect(route?.polyline.length).toBe(5);
  });

  it('should support step-free routing for wheelchair users avoiding stairs', () => {
    graph.addNode({ id: 'ROOM-A', floorLevel: 1, coordinates: { x: 0, y: 0, z: 3.5 }, type: 'room_entrance' });
    graph.addNode({ id: 'STAIRS', floorLevel: 1, coordinates: { x: 5, y: 0, z: 3.5 }, type: 'stairwell' });
    graph.addNode({ id: 'ELEVATOR', floorLevel: 1, coordinates: { x: 0, y: 10, z: 3.5 }, type: 'elevator' });
    graph.addNode({ id: 'EXIT', floorLevel: 0, coordinates: { x: 10, y: 10, z: 0 }, type: 'emergency_exit', isExit: true });

    graph.addEdge({ id: 'E_STAIR', source: 'ROOM-A', target: 'STAIRS', distanceMeters: 5 });
    graph.addEdge({ id: 'E_STAIR_DOWN', source: 'STAIRS', target: 'EXIT', distanceMeters: 5, isStepFree: false });

    graph.addEdge({ id: 'E_ELEV', source: 'ROOM-A', target: 'ELEVATOR', distanceMeters: 10, isStepFree: true });
    graph.addEdge({ id: 'E_ELEV_DOWN', source: 'ELEVATOR', target: 'EXIT', distanceMeters: 10, isStepFree: true });

    const stepFreeRoute = graph.findRoute('FAC-01', 'ROOM-A', 'EXIT', { requireStepFree: true });
    expect(stepFreeRoute).toBeDefined();
    expect(stepFreeRoute?.pathNodes.some((n) => n.nodeId === 'ELEVATOR')).toBe(true);
    expect(stepFreeRoute?.pathNodes.some((n) => n.nodeId === 'STAIRS')).toBe(false);
  });
});
