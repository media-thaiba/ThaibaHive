import { VisionDbStore } from '../../db/vision-store';

describe('VisionDbStore Multi-Tenant CRUD Operations', () => {
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve a vision camera with tenant isolation', async () => {
    const cam = await store.createCamera({
      cameraId: 'cam_gate_01',
      name: 'Main Campus Gate 1',
      facilityId: 'fac_main',
      zoneType: 'entrance',
      protocol: 'onvif',
      streamUrl: 'rtsp://192.168.1.100:554/live/ch0',
      resolution: '1080p',
      fps: 30,
      fovHorizontalDeg: 95.0,
      fovVerticalDeg: 65.0,
      mountingHeightMeters: 4.2,
      positionX: 10.5,
      positionY: 22.1,
      positionZ: 4.2,
      pitchDeg: -20.0,
      yawDeg: 45.0,
      rollDeg: 0.0,
      ptzCapable: true,
      status: 'online',
      isPrivacyMasked: false,
      institutionId: 'tenant_alpha',
    });

    expect(cam.cameraId).toBe('cam_gate_01');
    const retrieved = await store.getCameraById('cam_gate_01', 'tenant_alpha');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Main Campus Gate 1');

    // Cross-tenant check
    const crossTenant = await store.getCameraById('cam_gate_01', 'tenant_beta');
    expect(crossTenant).toBeNull();
  });

  it('should manage threat alerts and state updates', async () => {
    await store.recordThreatAlert({
      alertId: 'alt_001',
      cameraId: 'cam_gate_01',
      threatType: 'perimeter_intrusion',
      severity: 'critical',
      confidenceScore: 0.94,
      boundingPolygonJson: JSON.stringify([{ x: 100, y: 150 }, { x: 200, y: 350 }]),
      status: 'active',
      detectedAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    const activeAlerts = await store.listThreatAlerts('tenant_alpha', 'active');
    expect(activeAlerts.length).toBe(1);
    expect(activeAlerts[0].severity).toBe('critical');

    await store.updateThreatAlert('alt_001', { status: 'triaged' }, 'tenant_alpha');
    const updated = await store.getThreatAlertById('alt_001', 'tenant_alpha');
    expect(updated?.status).toBe('triaged');
  });

  it('should manage guard profiles and dispatches', async () => {
    await store.createGuardProfile({
      guardId: 'grd_01',
      staffId: 'staff_101',
      badgeNumber: 'SEC-8821',
      callSign: 'Eagle-1',
      status: 'on_duty',
      currentLocationX: 15.0,
      currentLocationY: 20.0,
      currentLocationZ: 0.0,
      batteryPercent: 92.0,
      lastHeartbeatAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    const guard = await store.getGuardProfileById('grd_01', 'tenant_alpha');
    expect(guard?.callSign).toBe('Eagle-1');

    const dispatch = await store.createGuardDispatch({
      dispatchId: 'dsp_001',
      incidentId: 'inc_100',
      guardId: 'grd_01',
      priority: 'urgent',
      assignedRouteJson: JSON.stringify([{ x: 15, y: 20 }, { x: 10, y: 22 }]),
      etaSeconds: 90,
      responseStatus: 'en_route',
      dispatchedAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    expect(dispatch.dispatchId).toBe('dsp_001');
    const dispatches = await store.listGuardDispatches('tenant_alpha', 'inc_100');
    expect(dispatches.length).toBe(1);
  });

  it('should manage ALPR logs and vehicle whitelist', async () => {
    await store.createVehicleWhitelist({
      permitId: 'prm_01',
      plateNumber: 'ABC-1234',
      ownerName: 'Dr. Jane Smith',
      ownerType: 'staff',
      validFrom: '2026-01-01',
      status: 'active',
      institutionId: 'tenant_alpha',
    });

    const permitted = await store.getVehicleWhitelistByPlate('ABC-1234', 'tenant_alpha');
    expect(permitted).not.toBeNull();
    expect(permitted?.ownerName).toBe('Dr. Jane Smith');

    await store.recordAlprLog({
      logId: 'alpr_001',
      cameraId: 'cam_gate_01',
      plateNumber: 'ABC-1234',
      confidenceScore: 0.98,
      direction: 'entry',
      gateId: 'main_gate',
      permitStatus: 'authorized_staff',
      gateActuated: true,
      capturedAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    const logs = await store.listAlprLogs('tenant_alpha', 'ABC-1234');
    expect(logs.length).toBe(1);
    expect(logs[0].gateActuated).toBe(true);
  });
});
