import { RawTelemetryPacket, NormalizedTelemetryReading, IngestionResult, ProtocolAdapter } from './ingestion-types';
import { MqttAdapter } from './adapters/mqtt-adapter';
import { ModbusAdapter } from './adapters/modbus-adapter';
import { BacnetAdapter } from './adapters/bacnet-adapter';
import { RestAdapter } from './adapters/rest-adapter';
import { timeSeriesBuffer } from '../telemetry/time-series-buffer';
import { facilityStore } from '../../../db/facility-store';

export class SensorIngestionGateway {
  private static instance: SensorIngestionGateway;
  private adapters: Map<string, ProtocolAdapter> = new Map();
  private lastKnownValues: Map<string, number> = new Map();

  private constructor() {
    this.registerAdapter(new MqttAdapter());
    this.registerAdapter(new ModbusAdapter());
    this.registerAdapter(new BacnetAdapter());
    this.registerAdapter(new RestAdapter());
  }

  public static getInstance(): SensorIngestionGateway {
    if (!SensorIngestionGateway.instance) {
      SensorIngestionGateway.instance = new SensorIngestionGateway();
    }
    return SensorIngestionGateway.instance;
  }

  public registerAdapter(adapter: ProtocolAdapter): void {
    this.adapters.set(adapter.protocol, adapter);
  }

  public async ingestPacket(packet: RawTelemetryPacket, institutionId: string = 'global'): Promise<IngestionResult> {
    const adapter = this.adapters.get(packet.protocol);
    if (!adapter) {
      return { success: false, error: `Unsupported protocol: ${packet.protocol}` };
    }

    try {
      const sensor = await facilityStore.getSensorById(packet.sensorId, institutionId);
      const defaultUnit = sensor ? sensor.unit : 'celsius';
      const parsed = adapter.parse(packet, defaultUnit);

      const equipmentId = packet.equipmentId || (sensor ? sensor.equipmentId : 'unknown_equip');
      const sensorType = parsed.sensorType || (sensor ? sensor.sensorType : 'temperature');

      // Deadband Filtering: check if deviation is within deadband threshold
      const deadband = sensor ? sensor.deadbandPercent : 1.5;
      const lastVal = this.lastKnownValues.get(`${institutionId}:${packet.sensorId}`);
      let isDeadbandFiltered = false;

      if (typeof lastVal === 'number' && lastVal !== 0) {
        const deltaPercent = Math.abs((parsed.value - lastVal) / lastVal) * 100;
        if (deltaPercent < deadband) {
          isDeadbandFiltered = true;
        }
      }

      this.lastKnownValues.set(`${institutionId}:${packet.sensorId}`, parsed.value);

      const normalized: NormalizedTelemetryReading = {
        sensorId: packet.sensorId,
        equipmentId,
        sensorType,
        value: parsed.value,
        unit: parsed.unit,
        timestamp: packet.timestamp || new Date().toISOString(),
        isDeadbandFiltered,
        rawPayload: packet.payload,
        institutionId,
      };

      // Persist to store and time series buffer
      timeSeriesBuffer.push(packet.sensorId, equipmentId, parsed.value, parsed.unit, institutionId);

      if (sensor) {
        await facilityStore.updateSensorReading(sensor.sensorId, parsed.value, institutionId);
      }

      await facilityStore.recordSensorReading({
        sensorId: packet.sensorId,
        equipmentId,
        readingValue: parsed.value,
        unit: parsed.unit,
        rawPayloadJson: JSON.stringify(packet.payload),
        recordedAt: normalized.timestamp,
        institutionId,
      });

      return {
        success: true,
        normalized,
        filteredOut: isDeadbandFiltered,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Ingestion failure',
      };
    }
  }

  public async ingestBatch(packets: RawTelemetryPacket[], institutionId: string = 'global'): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    for (const pkt of packets) {
      const res = await this.ingestPacket(pkt, institutionId);
      results.push(res);
    }
    return results;
  }
}

export const sensorIngestionGateway = SensorIngestionGateway.getInstance();
