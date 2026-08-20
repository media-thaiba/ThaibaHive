import { MetricType } from '../twin-types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export class ShaderMaterials {
  public static interpolateRgb(c1: [number, number, number], c2: [number, number, number], t: number): RgbColor {
    const clampedT = Math.max(0, Math.min(1, t));
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * clampedT);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * clampedT);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * clampedT);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return { r, g, b, hex };
  }

  /**
   * Get color for a metric value mapped across a normalized range [0, 1]
   */
  public static getHeatmapColor(metric: MetricType, value: number): RgbColor {
    switch (metric) {
      case 'temperature_c': {
        // Range 16 C (cold blue) to 32 C (hot red)
        const t = (value - 16) / (32 - 16);
        if (t < 0.33) {
          // Blue to Cyan
          return this.interpolateRgb([30, 144, 255], [0, 255, 255], t / 0.33);
        } else if (t < 0.66) {
          // Cyan to Green / Yellow
          return this.interpolateRgb([0, 255, 255], [255, 215, 0], (t - 0.33) / 0.33);
        } else {
          // Yellow to Red
          return this.interpolateRgb([255, 215, 0], [255, 69, 0], (t - 0.66) / 0.34);
        }
      }
      case 'co2_ppm': {
        // Range 400 ppm (fresh green) to 1800 ppm (poor purple)
        const t = (value - 400) / (1800 - 400);
        if (t < 0.35) {
          // Fresh Green to Moderate Yellow
          return this.interpolateRgb([34, 197, 94], [234, 179, 8], t / 0.35);
        } else if (t < 0.70) {
          // Yellow to Orange
          return this.interpolateRgb([234, 179, 8], [249, 115, 22], (t - 0.35) / 0.35);
        } else {
          // Orange to Deep Purple
          return this.interpolateRgb([249, 115, 22], [147, 51, 234], (t - 0.70) / 0.30);
        }
      }
      case 'noise_db': {
        // Range 30 dB (quiet blue) to 85 dB (loud red)
        const t = (value - 30) / (85 - 30);
        return this.interpolateRgb([59, 130, 246], [239, 68, 68], t);
      }
      case 'occupancy_count': {
        // 0 (available teal) to 50+ (high amber/rose)
        const t = Math.min(1, value / 50);
        return this.interpolateRgb([16, 185, 129], [225, 29, 72], t);
      }
      default:
        return { r: 59, g: 130, b: 246, hex: '#3b82f6' };
    }
  }
}
