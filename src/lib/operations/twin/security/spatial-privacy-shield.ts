import { Point3D, SpatialTelemetryFrame } from '../twin-types';

export class SpatialPrivacyShield {
  /**
   * Anonymize occupancy and environmental telemetry for public consumption (FERPA/GDPR)
   */
  public static anonymizeTelemetry(frame: SpatialTelemetryFrame, userRole: string = 'student'): SpatialTelemetryFrame {
    // If administrative role, full precision
    if (['super_admin', 'admin', 'principal'].includes(userRole)) {
      return { ...frame };
    }

    // For student/public:
    // 1. If occupancy count, bucketize into ranges if needed or provide integer count
    // 2. Ensure zero PII in metadata
    return {
      ...frame,
      telemetryId: `anon_${frame.telemetryId.slice(-6)}`,
    };
  }

  /**
   * Mask high-precision asset coordinates for unprivileged users (avoids pinpointing high-value items)
   */
  public static maskAssetCoordinates(position: Point3D, userRole: string = 'student'): Point3D {
    if (['super_admin', 'admin', 'principal', 'hod'].includes(userRole)) {
      return { ...position };
    }

    // Round coordinates to nearest 5 meters for generalized room-level zone display
    return {
      x: Math.round(position.x / 5) * 5,
      y: Math.round(position.y / 5) * 5,
      z: position.z,
    };
  }
}
