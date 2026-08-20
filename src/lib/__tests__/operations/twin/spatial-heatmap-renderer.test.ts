import { SpatialHeatmapRenderer } from '../../../operations/twin/rendering/spatial-heatmap-renderer';
import { ShaderMaterials } from '../../../operations/twin/rendering/shader-materials';

describe('Spatial Heatmap Renderer & Shader Materials', () => {
  it('should interpolate thermal colors across temperature spectrum', () => {
    const cold = ShaderMaterials.getHeatmapColor('temperature_c', 16);
    expect(cold.hex.toLowerCase()).toBe('#1e90ff'); // Blue

    const warm = ShaderMaterials.getHeatmapColor('temperature_c', 24);
    expect(warm.r).toBeGreaterThan(100);

    const hot = ShaderMaterials.getHeatmapColor('temperature_c', 32);
    expect(hot.hex.toLowerCase()).toBe('#ff4500'); // Red
  });

  it('should interpolate spatial values using Inverse Distance Weighting (IDW)', () => {
    const sensors = [
      { sensorId: 'S1', position: { x: 0, y: 0, z: 0 }, value: 20 },
      { sensorId: 'S2', position: { x: 10, y: 0, z: 0 }, value: 30 },
    ];

    // Midpoint should be approximately 25
    const midpointVal = SpatialHeatmapRenderer.interpolateValueAtPoint(
      { x: 5, y: 0, z: 0 },
      sensors
    );
    expect(midpointVal).toBe(25.0);

    // Exact sensor point
    const exactVal = SpatialHeatmapRenderer.interpolateValueAtPoint(
      { x: 0, y: 0, z: 0 },
      sensors
    );
    expect(exactVal).toBe(20.0);
  });

  it('should generate heatmap colorings for rooms', () => {
    const spaces = [
      { spaceId: 'ROOM-1', center: { x: 0, y: 0, z: 0 } },
      { spaceId: 'ROOM-2', center: { x: 10, y: 10, z: 0 } },
    ];
    const sensors = [
      { sensorId: 'S1', position: { x: 0, y: 0, z: 0 }, value: 21.5 },
    ];

    const heatmaps = SpatialHeatmapRenderer.renderSpacesHeatmap(spaces, sensors, 'temperature_c');
    expect(heatmaps.length).toBe(2);
    expect(heatmaps[0].spaceId).toBe('ROOM-1');
    expect(heatmaps[0].computedValue).toBe(21.5);
    expect(heatmaps[0].color.hex).toBeDefined();
  });
});
