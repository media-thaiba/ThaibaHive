import { ProtocolAdapter, RawTelemetryPacket } from '../ingestion-types';
import { SensorType } from '../../facility-types';

export class MqttAdapter implements ProtocolAdapter {
  public protocol = 'mqtt' as const;

  public parse(packet: RawTelemetryPacket, defaultUnit: string = 'celsius'): { value: number; unit: string; sensorType?: SensorType } {
    let value = 0;
    let unit = defaultUnit;
    let sensorType: SensorType | undefined;

    if (typeof packet.payload === 'number') {
      value = packet.payload;
    } else if (typeof packet.payload === 'string') {
      const parsed = parseFloat(packet.payload);
      value = isNaN(parsed) ? 0 : parsed;
    } else if (typeof packet.payload === 'object' && packet.payload !== null) {
      // Look for standard IoT telemetry keys: value, val, temp, vibration, pressure, etc.
      if (typeof packet.payload.value === 'number') {
        value = packet.payload.value;
      } else if (typeof packet.payload.val === 'number') {
        value = packet.payload.val;
      } else if (typeof packet.payload.temperature === 'number') {
        value = packet.payload.temperature;
        sensorType = 'temperature';
      } else if (typeof packet.payload.vibration === 'number') {
        value = packet.payload.vibration;
        sensorType = 'vibration';
      } else if (typeof packet.payload.pressure === 'number') {
        value = packet.payload.pressure;
        sensorType = 'pressure';
      } else if (typeof packet.payload.power_kw === 'number') {
        value = packet.payload.power_kw;
        sensorType = 'power_draw';
      } else if (typeof packet.payload.flow_rate === 'number') {
        value = packet.payload.flow_rate;
        sensorType = 'flow_rate';
      }

      if (packet.payload.unit) {
        unit = String(packet.payload.unit);
      }
    }

    // Unit Normalization: Fahrenheit to Celsius conversion if needed
    if (unit.toLowerCase() === 'fahrenheit' || unit.toLowerCase() === 'f' || unit.toLowerCase() === '°f') {
      value = ((value - 32) * 5) / 9;
      unit = 'celsius';
    }

    // Unit Normalization: PSI to kPa
    if (unit.toLowerCase() === 'psi') {
      value = value * 6.89476;
      unit = 'kpa';
    }

    return { value: Number(value.toFixed(4)), unit, sensorType };
  }
}
