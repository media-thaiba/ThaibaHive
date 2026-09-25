export interface BufferedReading {
  sensorId: string;
  equipmentId: string;
  value: number;
  unit: string;
  timestamp: number; // Unix timestamp in ms
}

export class TimeSeriesBuffer {
  private static instance: TimeSeriesBuffer;
  // Map of sensor key (`${tenantId}:${sensorId}`) -> circular buffer array of readings
  private buffers: Map<string, BufferedReading[]> = new Map();
  private maxBufferSize: number = 1000;

  public static getInstance(): TimeSeriesBuffer {
    if (!TimeSeriesBuffer.instance) {
      TimeSeriesBuffer.instance = new TimeSeriesBuffer();
    }
    return TimeSeriesBuffer.instance;
  }

  public setMaxBufferSize(size: number): void {
    this.maxBufferSize = size;
  }

  public push(sensorId: string, equipmentId: string, value: number, unit: string = 'celsius', tenantId: string = 'global', timestamp?: number): void {
    const key = `${tenantId}:${sensorId}`;
    if (!this.buffers.has(key)) {
      this.buffers.set(key, []);
    }
    const buf = this.buffers.get(key)!;
    const reading: BufferedReading = {
      sensorId,
      equipmentId,
      value,
      unit,
      timestamp: timestamp || Date.now(),
    };

    buf.push(reading);
    if (buf.length > this.maxBufferSize) {
      buf.shift();
    }
  }

  public getRecent(sensorId: string, tenantId: string = 'global', count: number = 50): BufferedReading[] {
    const key = `${tenantId}:${sensorId}`;
    const buf = this.buffers.get(key) || [];
    return buf.slice(-count);
  }

  public getWindow(sensorId: string, durationMs: number, tenantId: string = 'global'): BufferedReading[] {
    const key = `${tenantId}:${sensorId}`;
    const buf = this.buffers.get(key) || [];
    const cutoff = Date.now() - durationMs;
    return buf.filter((r) => r.timestamp >= cutoff);
  }

  public clear(tenantId?: string): void {
    if (tenantId) {
      for (const key of Array.from(this.buffers.keys())) {
        if (key.startsWith(`${tenantId}:`)) {
          this.buffers.delete(key);
        }
      }
    } else {
      this.buffers.clear();
    }
  }
}

export const timeSeriesBuffer = TimeSeriesBuffer.getInstance();
