import { CameraGatewayAdapter } from '../../../operations/vision/ingestion/camera-gateway-adapter';
import { StreamHealthMonitor } from '../../../operations/vision/ingestion/stream-health-monitor';
import { VisionDbStore } from '../../../db/vision-store';

describe('CameraGatewayAdapter Multi-Protocol Ingestion & Stream Health', () => {
  let adapter: CameraGatewayAdapter;
  let healthMonitor: StreamHealthMonitor;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    healthMonitor = new StreamHealthMonitor();
    adapter = new CameraGatewayAdapter(healthMonitor, store);
  });

  it('should connect to an ONVIF camera and initialize stream metrics', async () => {
    await store.createCamera({
      cameraId: 'cam_test_01',
      name: 'North Entrance',
      facilityId: 'fac_main',
      streamUrl: 'rtsp://10.0.0.50:554/live',
      status: 'offline',
      institutionId: 'tenant_alpha',
    });

    const conn = await adapter.connectCamera({
      cameraId: 'cam_test_01',
      protocol: 'onvif',
      streamUrl: 'rtsp://10.0.0.50:554/live',
      targetFps: 30,
    }, 'tenant_alpha');

    expect(conn.connected).toBe(true);
    expect(conn.metrics.status).toBe('online');
    expect(conn.metrics.fps).toBe(30);

    const cam = await store.getCameraById('cam_test_01', 'tenant_alpha');
    expect(cam?.status).toBe('online');
  });

  it('should detect degraded stream quality when packet loss is elevated', () => {
    const metrics = healthMonitor.recordHeartbeat(
      'cam_test_02',
      15,    // low FPS
      1024,
      22.0,  // high packet loss > 15%
      850,   // high latency > 800ms
      40.0
    );

    expect(metrics.status).toBe('degraded');
  });

  it('should detect camera lens occlusion when luminance variance is minimal', () => {
    const metrics = healthMonitor.recordHeartbeat(
      'cam_test_03',
      30,
      4096,
      0.0,
      100,
      1.2 // very low variance -> covered/sprayed lens
    );

    expect(metrics.status).toBe('occluded');
    expect(metrics.isOccluded).toBe(true);
  });

  it('should format and dispatch ONVIF PTZ move commands', async () => {
    await adapter.connectCamera({
      cameraId: 'cam_ptz_01',
      protocol: 'onvif',
      streamUrl: 'rtsp://10.0.0.60:554/ptz',
    });

    const ptz = await adapter.executePtzCommand('cam_ptz_01', {
      pan: 0.5,
      tilt: -0.2,
      zoom: 0.8,
    });

    expect(ptz.success).toBe(true);
    const parsed = JSON.parse(ptz.ptzCommand);
    expect(parsed.action).toBe('AbsoluteMove');
    expect(parsed.position.pan).toBe(0.5);
  });
});
