import { timeSeriesBuffer } from '../../../operations/facility/telemetry/time-series-buffer';
import { TelemetryAggregator } from '../../../operations/facility/telemetry/telemetry-aggregator';

describe('Time-Series Telemetry Buffer & Fast Query Aggregator (Sprint-052 FACILITY-004)', () => {
  beforeEach(() => {
    timeSeriesBuffer.clear();
  });

  it('should push and retrieve recent telemetry readings with circular buffer bounds', () => {
    timeSeriesBuffer.setMaxBufferSize(5);

    for (let i = 1; i <= 8; i++) {
      timeSeriesBuffer.push('SENSOR_FLOW_01', 'EQUIP_PUMP_01', i * 10, 'l_s', 'inst_alpha');
    }

    const recent = timeSeriesBuffer.getRecent('SENSOR_FLOW_01', 'inst_alpha', 10);
    // Buffer capped at 5 items: 40, 50, 60, 70, 80
    expect(recent).toHaveLength(5);
    expect(recent[0].value).toBe(40);
    expect(recent[4].value).toBe(80);
  });

  it('should calculate accurate statistical aggregations (mean, median, stdDev, RMS)', () => {
    const now = Date.now();
    const values = [10, 12, 14, 16, 18]; // mean=14, median=14, min=10, max=18, stdDev=sqrt(8)=2.8284

    values.forEach((v, idx) => {
      timeSeriesBuffer.push('SENSOR_TEMP_01', 'CHILLER_01', v, 'celsius', 'inst_alpha', now - (4 - idx) * 1000);
    });

    const summary = TelemetryAggregator.getAggregatesForWindow('SENSOR_TEMP_01', 60000, 'inst_alpha');
    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(5);
    expect(summary?.mean).toBe(14);
    expect(summary?.median).toBe(14);
    expect(summary?.min).toBe(10);
    expect(summary?.max).toBe(18);
    expect(summary?.stdDev).toBeCloseTo(2.8284, 2);
    expect(summary?.rms).toBeGreaterThan(14);
    expect(summary?.rateOfChange).toBe(2.0); // (18 - 10) / 4s = 2.0/s
  });
});
