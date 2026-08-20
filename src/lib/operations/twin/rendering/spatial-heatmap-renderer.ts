import { MetricType, Point3D } from '../twin-types';
import { ShaderMaterials, RgbColor } from './shader-materials';

export interface HeatmapSensorPoint {
  sensorId: string;
  position: Point3D;
  value: number;
}

export interface SpaceHeatmapColoring {
  spaceId: string;
  metric: MetricType;
  computedValue: number;
  color: RgbColor;
  transparency: number;
}

export class SpatialHeatmapRenderer {
  /**
   * Inverse Distance Weighting (IDW) interpolation
   * Computes estimated field value at arbitrary coordinate (x, y, z) based on nearby sensors
   */
  public static interpolateValueAtPoint(
    point: Point3D,
    sensors: HeatmapSensorPoint[],
    power: number = 2.0
  ): number {
    if (!sensors || sensors.length === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (const s of sensors) {
      const dx = point.x - s.position.x;
      const dy = point.y - s.position.y;
      const dz = point.z - s.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Exact coincidence with a sensor
      if (dist < 0.01) {
        return s.value;
      }

      const weight = 1.0 / Math.pow(dist, power);
      numerator += weight * s.value;
      denominator += weight;
    }

    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(2));
  }

  /**
   * Generate heatmap coloring for a list of spaces given active sensor readings
   */
  public static renderSpacesHeatmap(
    spaces: Array<{ spaceId: string; center: Point3D; directValue?: number }>,
    sensors: HeatmapSensorPoint[],
    metric: MetricType
  ): SpaceHeatmapColoring[] {
    return spaces.map((space) => {
      let val = space.directValue;
      if (val === undefined) {
        val = this.interpolateValueAtPoint(space.center, sensors);
      }

      const color = ShaderMaterials.getHeatmapColor(metric, val);
      return {
        spaceId: space.spaceId,
        metric,
        computedValue: val,
        color,
        transparency: 0.65,
      };
    });
  }
}
