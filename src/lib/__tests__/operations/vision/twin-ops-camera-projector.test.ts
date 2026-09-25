import { TwinOpsCameraProjector } from '../../../operations/vision/spatial/twin-ops-camera-projector';
import { FovFrustumCalculator } from '../../../operations/vision/spatial/fov-frustum-calculator';
import { VisionDbStore } from '../../../db/vision-store';

describe('TwinOpsCameraProjector 3D Frustum & Spatial Ground Projection', () => {
  let projector: TwinOpsCameraProjector;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    projector = new TwinOpsCameraProjector(store);
  });

  it('should compute valid 3D pyramid frustum coordinates for a camera', () => {
    const frustum = FovFrustumCalculator.compute3DFrustum({
      cameraId: 'cam_3d_01',
      horizontalFovDeg: 90.0,
      verticalFovDeg: 60.0,
      mountingHeightMeters: 4.0,
      position: { x: 10, y: 15, z: 4.0 },
      orientation: { pitchDeg: -20.0, yawDeg: 0.0, rollDeg: 0.0 },
      nearPlaneMeters: 0.5,
      farPlaneMeters: 30.0,
    });

    expect(frustum.vertices3D.length).toBe(5); // Apex + 4 base vertices
    expect(frustum.vertices3D[0].x).toBe(10);
    expect(frustum.vertices3D[0].z).toBe(4.0);
  });

  it('should project a 2D image pixel detection onto 3D facility ground coordinates', () => {
    const coord3D = projector.projectDetectionTo3D(960, 540, 1920, 1080, {
      cameraId: 'cam_3d_01',
      horizontalFovDeg: 90.0,
      verticalFovDeg: 60.0,
      mountingHeightMeters: 4.0,
      position: { x: 0, y: 0, z: 4.0 },
      orientation: { pitchDeg: -20.0, yawDeg: 0.0, rollDeg: 0.0 },
    });

    expect(coord3D.z).toBe(0.0);
    expect(coord3D.y).toBeGreaterThan(0);
  });

  it('should compute overall facility security coverage metrics', async () => {
    await store.createCamera({
      cameraId: 'cam_fac_01',
      name: 'South Lobby',
      facilityId: 'fac_engineering',
      fovHorizontalDeg: 90.0,
      fovVerticalDeg: 60.0,
      positionX: 20,
      positionY: 30,
      positionZ: 3.5,
      streamUrl: 'rtsp://10.0.0.10:554/live',
      institutionId: 'tenant_alpha',
    });

    const coverage = await projector.computeCoverageMetrics('fac_engineering', 'tenant_alpha');
    expect(coverage.totalAreaSqMeters).toBe(8000);
    expect(coverage.coveragePercentage).toBeGreaterThan(0);
  });
});
