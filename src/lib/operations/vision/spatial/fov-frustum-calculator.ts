import { SpatialCoordinate3D, CameraFrustum } from '../vision-types';

export interface CameraPoseConfig {
  cameraId: string;
  horizontalFovDeg: number;
  verticalFovDeg: number;
  mountingHeightMeters: number;
  position: SpatialCoordinate3D;
  orientation: {
    pitchDeg: number;
    yawDeg: number;
    rollDeg: number;
  };
  nearPlaneMeters?: number;
  farPlaneMeters?: number;
}

export class FovFrustumCalculator {
  public static compute3DFrustum(config: CameraPoseConfig): CameraFrustum {
    const near = config.nearPlaneMeters || 0.5;
    const far = config.farPlaneMeters || 40.0;

    const hFovRad = (config.horizontalFovDeg * Math.PI) / 180.0;
    const vFovRad = (config.verticalFovDeg * Math.PI) / 180.0;
    const pitchRad = (config.orientation.pitchDeg * Math.PI) / 180.0;
    const yawRad = (config.orientation.yawDeg * Math.PI) / 180.0;

    // Near and far plane half-dimensions
    const nearH = near * Math.tan(vFovRad / 2);
    const nearW = near * Math.tan(hFovRad / 2);
    const farH = far * Math.tan(vFovRad / 2);
    const farW = far * Math.tan(hFovRad / 2);

    const apex: SpatialCoordinate3D = { ...config.position };

    // Generate 4 base vertices of far plane pyramid
    const farVertices: SpatialCoordinate3D[] = [
      { x: config.position.x + farW * Math.cos(yawRad), y: config.position.y + far * Math.cos(pitchRad), z: Math.max(0, config.position.z - far * Math.sin(-pitchRad) + farH) },
      { x: config.position.x - farW * Math.cos(yawRad), y: config.position.y + far * Math.cos(pitchRad), z: Math.max(0, config.position.z - far * Math.sin(-pitchRad) + farH) },
      { x: config.position.x - farW * Math.cos(yawRad), y: config.position.y + far * Math.cos(pitchRad), z: Math.max(0, config.position.z - far * Math.sin(-pitchRad) - farH) },
      { x: config.position.x + farW * Math.cos(yawRad), y: config.position.y + far * Math.cos(pitchRad), z: Math.max(0, config.position.z - far * Math.sin(-pitchRad) - farH) },
    ];

    return {
      cameraId: config.cameraId,
      horizontalFov: config.horizontalFovDeg,
      verticalFov: config.verticalFovDeg,
      mountingHeight: config.mountingHeightMeters,
      position: config.position,
      orientation: {
        pitch: config.orientation.pitchDeg,
        yaw: config.orientation.yawDeg,
        roll: config.orientation.rollDeg,
      },
      nearPlane: near,
      farPlane: far,
      vertices3D: [apex, ...farVertices],
    };
  }

  /**
   * Project 2D pixel coordinates (u, v) from camera image onto 3D facility ground plane (Z=0)
   */
  public static projectPixelToWorld(
    u: number,
    v: number,
    imageWidth: number,
    imageHeight: number,
    config: CameraPoseConfig
  ): SpatialCoordinate3D {
    const normU = (u - imageWidth / 2) / (imageWidth / 2);
    const normV = (v - imageHeight / 2) / (imageHeight / 2);

    const hFovRad = (config.horizontalFovDeg * Math.PI) / 180.0;
    const pitchRad = (config.orientation.pitchDeg * Math.PI) / 180.0;

    const groundDistance = config.position.z / Math.max(0.1, Math.tan(-pitchRad + normV * 0.3));
    const lateralOffset = groundDistance * Math.tan(normU * (hFovRad / 2));

    return {
      x: Number((config.position.x + lateralOffset).toFixed(2)),
      y: Number((config.position.y + groundDistance).toFixed(2)),
      z: 0.0,
    };
  }
}
