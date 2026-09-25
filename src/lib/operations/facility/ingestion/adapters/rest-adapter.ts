import { ProtocolAdapter, RawTelemetryPacket } from '../ingestion-types';
import { SensorType } from '../../facility-types';

export class RestAdapter implements ProtocolAdapter {
  public protocol = 'rest' as const;

  public parse(packet: RawTelemetryPacket, defaultUnit: string = 'celsius'): { value: number; unit: string; sensorType?: SensorType } {
    let value = 0;
    let unit = defaultUnit;
    let sensorType: SensorType | undefined;

    if (typeof packet.payload === 'number') {
      value = packet.payload;
    } else if (typeof packet.payload === 'object' && packet.payload !== null) {
      if (typeof packet.payload.reading === 'number') {
        value = packet.payload.reading;
      } else if (typeof packet.payload.value === 'number') {
        value = packet.payload.value;
      } else if (typeof packet.payload.val === 'number') {
        value = packet.payload.val;
      }

      if (packet.payload.unit) {
        unit = String(packet.payload.unit);
      }
      if (packet.payload.sensor_type) {
        sensorType = packet.payload.sensor_type as SensorType;
      }
    }

    return { value: Number(value.toFixed(4)), unit, sensorType };
  }
}
