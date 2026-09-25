import { IngestionProtocol, SensorType } from '../facility-types';

export interface RawTelemetryPacket {
  protocol: IngestionProtocol;
  sensorId: string;
  equipmentId?: string;
  timestamp?: string;
  payload: Record<string, any> | number | string;
  metadata?: Record<string, any>;
}

export interface NormalizedTelemetryReading {
  sensorId: string;
  equipmentId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  timestamp: string;
  isDeadbandFiltered: boolean;
  rawPayload: any;
  institutionId: string;
}

export interface ProtocolAdapter {
  protocol: IngestionProtocol;
  parse(packet: RawTelemetryPacket, defaultUnit?: string): { value: number; unit: string; sensorType?: SensorType };
}

export interface IngestionResult {
  success: boolean;
  normalized?: NormalizedTelemetryReading;
  error?: string;
  filteredOut?: boolean;
}
