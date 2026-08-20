import { SpatialGraphEngine } from '../../../operations/twin/wayfinding/spatial-graph-engine';
import { EmergencyEvacuationRouter } from '../../../operations/twin/wayfinding/emergency-evacuation-router';

describe('Emergency Evacuation Router & Dynamic Hazard Avoidance', () => {
  let graph: SpatialGraphEngine;
  let router: EmergencyEvacuationRouter;

  beforeEach(() => {
    graph = new SpatialGraphEngine();
    router = new EmergencyEvacuationRouter(graph);

    // Setup nodes: 1 room, 2 exits (North Exit, South Exit)
    graph.addNode({ id: 'LAB-101', floorLevel: 0, coordinates: { x: 0, y: 0, z: 0 }, type: 'room_entrance' });
    graph.addNode({ id: 'HALL-NORTH', floorLevel: 0, coordinates: { x: 0, y: 10, z: 0 } });
    graph.addNode({ id: 'EXIT-NORTH', floorLevel: 0, coordinates: { x: 0, y: 20, z: 0 }, isExit: true });

    graph.addNode({ id: 'HALL-SOUTH', floorLevel: 0, coordinates: { x: 0, y: -15, z: 0 } });
    graph.addNode({ id: 'EXIT-SOUTH', floorLevel: 0, coordinates: { x: 0, y: -30, z: 0 }, isExit: true });

    graph.addEdge({ id: 'E_N1', source: 'LAB-101', target: 'HALL-NORTH', distanceMeters: 10 });
    graph.addEdge({ id: 'E_N2', source: 'HALL-NORTH', target: 'EXIT-NORTH', distanceMeters: 10 });

    graph.addEdge({ id: 'E_S1', source: 'LAB-101', target: 'HALL-SOUTH', distanceMeters: 15 });
    graph.addEdge({ id: 'E_S2', source: 'HALL-SOUTH', target: 'EXIT-SOUTH', distanceMeters: 15 });
  });

  it('should route to closest exit under normal conditions', () => {
    const route = router.calculateEvacuationRoute('FAC-01', 'LAB-101');
    expect(route).toBeDefined();
    expect(route?.targetNodeId).toBe('EXIT-NORTH'); // North exit is 20m vs South 30m
    expect(route?.totalDistanceMeters).toBe(20);
    expect(route?.isEmergencyRoute).toBe(true);
  });

  it('should dynamically re-route to alternative exit when primary route is blocked by fire', () => {
    // Declare fire in North hallway
    router.declareHazard({
      hazardId: 'HAZ-FIRE-01',
      facilityId: 'FAC-01',
      hazardType: 'fire',
      blockedNodeIds: ['HALL-NORTH'],
      blockedEdgeIds: ['E_N1', 'E_N2'],
      declaredAt: new Date().toISOString(),
    });

    const rerouted = router.calculateEvacuationRoute('FAC-01', 'LAB-101');
    expect(rerouted).toBeDefined();
    expect(rerouted?.targetNodeId).toBe('EXIT-SOUTH'); // Automatically diverts to South exit
    expect(rerouted?.totalDistanceMeters).toBe(30);
  });

  it('should compute full building evacuation and simulate crowd flow in under 5 seconds', () => {
    const result = router.computeAllEvacuationRoutesAndSimulate('FAC-01', {
      'LAB-101': 45,
    });

    expect(result.calculationTimeMs).toBeLessThan(5000); // Sub-5 second requirement
    expect(result.simulationReport.totalOccupants).toBe(45);
    expect(result.simulationReport.evacuationPercentage).toBe(100);
  });
});
