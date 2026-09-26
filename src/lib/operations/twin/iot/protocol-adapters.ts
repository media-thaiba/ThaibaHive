import { MetricType, SpatialTelemetryFrame } from '../twin-types';

export interface RawMqttMessage {
  topic: string;
  payload: string | Record<string, any>;
  qos?: number;
  timestamp?: string;
}

export interface RawCoapMessage {
  path: string;
  code: string;
  payload: string | Record<string, any>;
  timestamp?: string;
}

export interface RawWebhookPayload {
  gatewayId: string;
  deviceType?: string;
  readings: Array<{
    sensorId: string;
    metric: string;
    value: number | string;
    unit?: string;
    timestamp?: string;
  }>;
}

export class ProtocolAdapters {
  /**
   * Parse MQTT topic format: campus/{tenantId}/{facilityId}/{spaceId}/{sensorId}/{metricType}
   */
  public static parseMqtt(msg: RawMqttMessage, defaultTenant: string = 'global'): Partial<SpatialTelemetryFrame>[] {
    const parts = msg.topic.split('/');
    // e.g. campus/inst_01/FAC-01/SPC-101/SEN-01/temperature
    let _tenantId = defaultTenant;
    let facilityId = 'unknown';
    let spaceId: string | undefined = undefined;
    let sensorId = 'unknown';
    let metricType: MetricType = 'temperature_c';

    if (parts.length >= 6) {
      _tenantId = parts[1];
      facilityId = parts[2];
      spaceId = parts[3] === 'none' ? undefined : parts[3];
      sensorId = parts[4];
      metricType = this.normalizeMetricName(parts[5]);
    } else if (parts.length >= 4) {
      facilityId = parts[1];
      sensorId = parts[2];
      metricType = this.normalizeMetricName(parts[3]);
    }

    let payloadObj: any;
    if (typeof msg.payload === 'string') {
      try {
        payloadObj = JSON.parse(msg.payload);
      } catch {
        payloadObj = { val: parseFloat(msg.payload) || 0 };
      }
    } else {
      payloadObj = msg.payload;
    }

    const value = typeof payloadObj.val === 'number' ? payloadObj.val : (typeof payloadObj.value === 'number' ? payloadObj.value : 0);
    const unit = payloadObj.unit || this.getDefaultUnit(metricType);

    return [
      {
        telemetryId: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sensorId,
        facilityId,
        spaceId,
        metricType,
        value: this.normalizeMetricValue(metricType, value, unit),
        unit: this.getDefaultUnit(metricType),
        isAnomaly: false,
        timestamp: msg.timestamp || new Date().toISOString(),
      },
    ];
  }

  /**
   * Parse CoAP message: /sensors/{facilityId}/{sensorId}
   */
  public static parseCoap(msg: RawCoapMessage, _tenantId: string = 'global'): Partial<SpatialTelemetryFrame>[] {
    const parts = msg.path.split('/').filter(Boolean);
    const facilityId = parts[1] || 'facility_default';
    const sensorId = parts[2] || 'sensor_default';

    let payloadObj: any = {};
    if (typeof msg.payload === 'string') {
      try {
        payloadObj = JSON.parse(msg.payload);
      } catch {
        payloadObj = { temperature: parseFloat(msg.payload) || 22.0 };
      }
    } else {
      payloadObj = msg.payload;
    }

    const frames: Partial<SpatialTelemetryFrame>[] = [];
    for (const [key, rawVal] of Object.entries(payloadObj)) {
      if (typeof rawVal === 'number') {
        const metric = this.normalizeMetricName(key);
        frames.push({
          telemetryId: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sensorId,
          facilityId,
          metricType: metric,
          value: this.normalizeMetricValue(metric, rawVal, ''),
          unit: this.getDefaultUnit(metric),
          isAnomaly: false,
          timestamp: msg.timestamp || new Date().toISOString(),
        });
      }
    }
    return frames;
  }

  /**
   * Parse HTTP Webhook multi-sensor payload
   */
  public static parseWebhook(payload: RawWebhookPayload, _tenantId: string = 'global'): Partial<SpatialTelemetryFrame>[] {
    return payload.readings.map((r) => {
      const metric = this.normalizeMetricName(r.metric);
      const numVal = typeof r.value === 'number' ? r.value : parseFloat(r.value) || 0;
      return {
        telemetryId: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sensorId: r.sensorId,
        facilityId: payload.gatewayId,
        metricType: metric,
        value: this.normalizeMetricValue(metric, numVal, r.unit),
        unit: this.getDefaultUnit(metric),
        isAnomaly: false,
        timestamp: r.timestamp || new Date().toISOString(),
      };
    });
  }

  public static normalizeMetricName(raw: string): MetricType {
    const lower = raw.toLowerCase().trim();
    if (lower.includes('temp')) return 'temperature_c';
    if (lower.includes('humid')) return 'humidity_pct';
    if (lower.includes('co2')) return 'co2_ppm';
    if (lower.includes('noise') || lower.includes('sound') || lower.includes('db')) return 'noise_db';
    if (lower.includes('occup') || lower.includes('pir') || lower.includes('count') || lower.includes('people')) return 'occupancy_count';
    if (lower.includes('power') || lower.includes('energy') || lower.includes('kw') || lower.includes('watt')) return 'power_kw';
    if (lower.includes('aqi') || lower.includes('air')) return 'air_quality_index';
    if (lower.includes('rssi') || lower.includes('ble') || lower.includes('signal')) return 'rssi_dbm';
    return 'temperature_c';
  }

  public static normalizeMetricValue(metric: MetricType, value: number, unit?: string): number {
    if (metric === 'temperature_c') {
      // If Fahrenheit passed, convert to Celsius
      if (unit && (unit.toLowerCase() === 'f' || unit.toLowerCase() === 'fahrenheit' || value > 55)) {
        return Number(((value - 32) * (5 / 9)).toFixed(2));
      }
      return Number(value.toFixed(2));
    }
    if (metric === 'humidity_pct') {
      return Math.min(100, Math.max(0, Number(value.toFixed(1))));
    }
    if (metric === 'co2_ppm') {
      return Math.max(0, Math.round(value));
    }
    if (metric === 'noise_db') {
      return Math.max(0, Number(value.toFixed(1)));
    }
    if (metric === 'occupancy_count') {
      return Math.max(0, Math.round(value));
    }
    if (metric === 'power_kw') {
      return Math.max(0, Number(value.toFixed(3)));
    }
    return Number(value.toFixed(2));
  }

  public static getDefaultUnit(metric: MetricType): string {
    switch (metric) {
      case 'temperature_c': return '°C';
      case 'humidity_pct': return '%';
      case 'co2_ppm': return 'ppm';
      case 'noise_db': return 'dB';
      case 'occupancy_count': return 'people';
      case 'power_kw': return 'kW';
      case 'air_quality_index': return 'AQI';
      case 'rssi_dbm': return 'dBm';
      default: return 'unit';
    }
  }
}
