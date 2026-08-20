import { TwinDbStore } from '../../db/twin-store';

describe('TwinDbStore CRUD & Tenant Isolation', () => {
  let store: TwinDbStore;

  beforeEach(() => {
    store = TwinDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve facility with tenant isolation', async () => {
    await store.createFacility({
      facilityId: 'FAC-001',
      name: 'Science & Engineering Complex',
      code: 'SEC',
      facilityType: 'academic',
      totalFloors: 4,
      totalAreaSqMeters: 12500,
      institutionId: 'inst_alpha',
    });

    const foundAlpha = await store.getFacilityById('FAC-001', 'inst_alpha');
    expect(foundAlpha).toBeDefined();
    expect(foundAlpha?.name).toBe('Science & Engineering Complex');

    const foundBeta = await store.getFacilityById('FAC-001', 'inst_beta');
    expect(foundBeta).toBeNull();
  });

  it('should create, list, and update spaces', async () => {
    await store.createSpace({
      spaceId: 'SPC-101',
      facilityId: 'FAC-001',
      floorLevel: 1,
      name: 'Robotics Lab',
      code: 'LAB-101',
      spaceType: 'laboratory',
      capacity: 40,
      institutionId: 'inst_alpha',
    });

    const spaces = await store.listSpaces('inst_alpha', 'FAC-001');
    expect(spaces.length).toBe(1);
    expect(spaces[0].name).toBe('Robotics Lab');

    const updated = await store.updateSpace('SPC-101', { currentOccupancy: 25, comfortScore: 92.5 }, 'inst_alpha');
    expect(updated?.currentOccupancy).toBe(25);
    expect(updated?.comfortScore).toBe(92.5);
  });

  it('should handle sensor registration, updates, and telemetry recording', async () => {
    await store.createSensor({
      sensorId: 'SEN-AIR-01',
      facilityId: 'FAC-001',
      spaceId: 'SPC-101',
      sensorType: 'co2',
      protocol: 'mqtt',
      institutionId: 'inst_alpha',
    });

    await store.recordTelemetry({
      telemetryId: 'TEL-001',
      sensorId: 'SEN-AIR-01',
      metricType: 'co2_ppm',
      numericValue: 450.0,
      unit: 'ppm',
      recordedAt: new Date().toISOString(),
      institutionId: 'inst_alpha',
    });

    const telemetry = await store.listTelemetry('inst_alpha', 'SEN-AIR-01');
    expect(telemetry.length).toBe(1);
    expect(telemetry[0].numericValue).toBe(450.0);
  });

  it('should manage assets, geofences, and maintenance orders', async () => {
    await store.createAsset({
      assetId: 'AST-SPECTRO-01',
      facilityId: 'FAC-001',
      spaceId: 'SPC-101',
      tagId: 'BLE:AA:BB:CC:11',
      name: 'High-Precision Spectrometer',
      category: 'lab_equipment',
      purchaseCost: 45000,
      institutionId: 'inst_alpha',
    });

    const asset = await store.getAssetByTagId('BLE:AA:BB:CC:11', 'inst_alpha');
    expect(asset).toBeDefined();
    expect(asset?.name).toBe('High-Precision Spectrometer');

    await store.createGeofence({
      geofenceId: 'GEO-LAB-01',
      facilityId: 'FAC-001',
      spaceId: 'SPC-101',
      name: 'Robotics Lab Secure Zone',
      severity: 'high',
      institutionId: 'inst_alpha',
    });

    const geofences = await store.listGeofences('inst_alpha', 'FAC-001');
    expect(geofences.length).toBe(1);

    await store.createMaintenanceOrder({
      orderId: 'MORD-001',
      facilityId: 'FAC-001',
      assetId: 'AST-SPECTRO-01',
      title: 'Annual Calibration',
      description: 'Optical sensor recalibration',
      priority: 'medium',
      institutionId: 'inst_alpha',
    });

    const orders = await store.listMaintenanceOrders('inst_alpha');
    expect(orders.length).toBe(1);
    expect(orders[0].title).toBe('Annual Calibration');
  });

  it('should store and query wayfinding nodes and edges', async () => {
    await store.createWayfindingNode({
      nodeId: 'NODE-101',
      facilityId: 'FAC-001',
      floorLevel: 1,
      nodeType: 'room_entrance',
      institutionId: 'inst_alpha',
    });

    await store.createWayfindingNode({
      nodeId: 'NODE-EXIT-1',
      facilityId: 'FAC-001',
      floorLevel: 1,
      nodeType: 'emergency_exit',
      isExit: true,
      institutionId: 'inst_alpha',
    });

    await store.createWayfindingEdge({
      edgeId: 'EDGE-101-EXIT',
      facilityId: 'FAC-001',
      sourceNodeId: 'NODE-101',
      targetNodeId: 'NODE-EXIT-1',
      distanceMeters: 15.5,
      transitTimeSeconds: 12.0,
      institutionId: 'inst_alpha',
    });

    const nodes = await store.listWayfindingNodes('inst_alpha', 'FAC-001', 1);
    expect(nodes.length).toBe(2);

    const edges = await store.listWayfindingEdges('inst_alpha', 'FAC-001');
    expect(edges.length).toBe(1);
    expect(edges[0].distanceMeters).toBe(15.5);
  });
});
