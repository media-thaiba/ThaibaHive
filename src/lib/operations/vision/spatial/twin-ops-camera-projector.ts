import { FovFrustumCalculator, CameraPoseConfig } from './fov-frustum-calculator';
import { BlindSpotAnalyzer, CoverageMapResult } from './blind-spot-analyzer';
import { CameraFrustum, SpatialCoordinate3D } from '../vision-types';
import { VisionDbStore } from '../../../db/vision-store';

export class TwinOpsCameraProjector {
  private dbStore: VisionDbStore;

  constructor(dbStore?: VisionDbStore) {
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async getFacilityFrustums(facilityId: string, tenantId: string = 'global'): Promise<CameraFrustum[]> {
    const cameras = await this.dbStore.listCameras(tenantId, facilityId);
    return cameras.map((c) => {
      const config: CameraPoseConfig = {
        cameraId: c.cameraId,
        horizontalFovDeg: c.fovHorizontalDeg || 90.0,
        verticalFovDeg: c.fovVerticalDeg || 60.0,
        mountingHeightMeters: c.mountingHeightMeters || 3.5,
        position: { x: c.positionX || 0, y: c.positionY || 0, z: c.positionZ || 3.5 },
        orientation: {
          pitchDeg: c.pitchDeg || -15.0,
          yawDeg: c.yawDeg || 0.0,
          rollDeg: c.rollDeg || 0.0,
        },
      };
      return FovFrustumCalculator.compute3DFrustum(config);
    });
  }

  public async computeCoverageMetrics(facilityId: string, tenantId: string = 'global'): Promise<CoverageMapResult> {
    const frustums = await this.getFacilityFrustums(facilityId, tenantId);
    return BlindSpotAnalyzer.analyzeCoverage(facilityId, frustums);
  }

  public projectDetectionTo3D(
    u: number,
    v: number,
    imageWidth: number,
    imageHeight: number,
    cameraConfig: CameraPoseConfig
  ): SpatialCoordinate3D {
    return FovFrustumCalculator.projectPixelToWorld(u, v, imageWidth, imageHeight, cameraConfig);
  }
}
