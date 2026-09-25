import { ProtocolAdapter, RawTelemetryPacket } from '../ingestion-types';
import { SensorType } from '../../facility-types';

export class BacnetAdapter implements ProtocolAdapter {
  public protocol = 'bacnet' as const;

  public parse(packet: RawTelemetryPacket, defaultUnit: string = 'celsius'): { value: number; unit: string; sensorType?: SensorType } {
    let value = 0;
    let unit = defaultUnit;
    let sensorType: SensorType | undefined;

    if (typeof packet.payload === 'number') {
      value = packet.payload;
    } else if (typeof packet.payload === 'object' && packet.payload !== null) {
      // BACnet objects: analog-input (AI), analog-value (AV), present_value
      const presentValue = packet.payload.present_value ?? packet.payload.value ?? packet.payload.val;
      if (typeof presentValue === 'number') {
        value = presentValue;
      }

      const objectType = String(packet.payload.object_type || '').toLowerCase();
      if (objectType.includes('temp') || packet.payload.units === 'degrees-celsius') {
        sensorType = 'temperature';
        unit = 'celsius';
      } else if (objectType.includes('pressure') || packet.payload.units === 'kilopascals') {
        sensorType = 'pressure';
        unit = 'kpa';
      } else if (objectType.includes('flow') || packet.payload.units === 'liters-per-second') {
        sensorType = 'flow_rate';
        unit = 'l_s';
      } else if (objectType.includes('filter') || packet.payload.units === 'pascals') {
        sensorType = 'filter_delta_p';
        unit = 'pa';
      }

      if (packet.payload.unit) {
        unit = String(packet.payload.unit);
      }
    }

    return { value: Number(value.toFixed(4)), unit, sensorType };
  }
}
