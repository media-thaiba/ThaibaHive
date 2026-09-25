import { ProtocolAdapter, RawTelemetryPacket } from '../ingestion-types';
import { SensorType } from '../../facility-types';

export class ModbusAdapter implements ProtocolAdapter {
  public protocol = 'modbus' as const;

  public parse(packet: RawTelemetryPacket, defaultUnit: string = 'kw'): { value: number; unit: string; sensorType?: SensorType } {
    let value = 0;
    let unit = defaultUnit;
    let sensorType: SensorType | undefined = 'power_draw';

    if (typeof packet.payload === 'number') {
      value = packet.payload;
    } else if (typeof packet.payload === 'object' && packet.payload !== null) {
      // Modbus registers often provide holding_register or raw integer requiring scaling
      const rawReg = packet.payload.register_value ?? packet.payload.holding_register ?? packet.payload.value;
      const multiplier = packet.payload.scale_factor ?? packet.payload.multiplier ?? 1;

      if (typeof rawReg === 'number') {
        value = rawReg * multiplier;
      }

      if (packet.payload.register_type === 'power' || packet.payload.metric === 'active_power') {
        sensorType = 'power_draw';
        unit = 'kw';
      } else if (packet.payload.register_type === 'temperature') {
        sensorType = 'temperature';
        unit = 'celsius';
      } else if (packet.payload.register_type === 'current') {
        unit = 'amperes';
      }
    }

    return { value: Number(value.toFixed(4)), unit, sensorType };
  }
}
