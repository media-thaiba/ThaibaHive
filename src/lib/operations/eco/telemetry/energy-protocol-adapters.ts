/**
 * Energy Protocol Adapters
 * Normalizes multi-vendor protocol feeds (Modbus-TCP / SunSpec, MQTT, JSON Webhooks)
 */

export interface NormalizedEnergyTelemetry {
  telemetryId: string;
  assetId: string;
  sourceType: 'smart_meter' | 'solar_pv' | 'bess' | 'ev_charger' | 'grid_feed';
  powerKw: number;
  energyKwh: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  frequencyHz: number;
  socPercent?: number;
  carbonGramsPerKwh: number;
  recordedAt: string;
  institutionId: string;
}

export class EnergyProtocolAdapters {
  /**
   * Parse SunSpec / Modbus Inverter register map
   */
  public static parseSunSpecPayload(raw: {
    deviceId: string;
    model: number;
    watts: number;
    scaleWatts?: number;
    volts: number;
    amps: number;
    hz: number;
    wHoursTotal: number;
    timestamp?: string;
    institutionId?: string;
  }): NormalizedEnergyTelemetry {
    const scale = raw.scaleWatts !== undefined ? Math.pow(10, raw.scaleWatts) : 1;
    const powerKw = Number(((raw.watts * scale) / 1000).toFixed(3));
    const energyKwh = Number((raw.wHoursTotal / 1000).toFixed(3));
    const powerFactor = raw.volts > 0 && raw.amps > 0 ? Math.min(1.0, (powerKw * 1000) / (raw.volts * raw.amps)) : 0.98;

    return {
      telemetryId: `telem_sun_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assetId: raw.deviceId,
      sourceType: 'solar_pv',
      powerKw,
      energyKwh,
      voltageV: raw.volts,
      currentA: raw.amps,
      powerFactor: Number(powerFactor.toFixed(3)),
      frequencyHz: raw.hz,
      carbonGramsPerKwh: 0, // Zero emissions for on-site solar
      recordedAt: raw.timestamp || new Date().toISOString(),
      institutionId: raw.institutionId || 'global',
    };
  }

  /**
   * Parse Smart Meter MQTT JSON Packet
   */
  public static parseMqttSmartMeter(payload: {
    meter_id: string;
    active_power_kw: number;
    cumulative_kwh: number;
    l1_voltage: number;
    l1_current: number;
    pf?: number;
    freq?: number;
    grid_carbon_intensity?: number;
    ts?: string;
    tenant_id?: string;
  }): NormalizedEnergyTelemetry {
    return {
      telemetryId: `telem_mqtt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assetId: payload.meter_id,
      sourceType: 'smart_meter',
      powerKw: payload.active_power_kw,
      energyKwh: payload.cumulative_kwh,
      voltageV: payload.l1_voltage,
      currentA: payload.l1_current,
      powerFactor: payload.pf ?? 0.98,
      frequencyHz: payload.freq ?? 50.0,
      carbonGramsPerKwh: payload.grid_carbon_intensity ?? 350.0,
      recordedAt: payload.ts || new Date().toISOString(),
      institutionId: payload.tenant_id || 'global',
    };
  }

  /**
   * Parse BESS Battery Management System (BMS) Telemetry
   */
  public static parseBmsPayload(payload: {
    battery_id: string;
    pack_voltage_v: number;
    pack_current_a: number;
    soc_percent: number;
    charge_power_kw?: number;
    discharge_power_kw?: number;
    cumulative_throughput_kwh: number;
    ts?: string;
    institution_id?: string;
  }): NormalizedEnergyTelemetry {
    const powerKw = payload.pack_voltage_v * payload.pack_current_a / 1000;
    return {
      telemetryId: `telem_bms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assetId: payload.battery_id,
      sourceType: 'bess',
      powerKw: Number(powerKw.toFixed(3)),
      energyKwh: payload.cumulative_throughput_kwh,
      voltageV: payload.pack_voltage_v,
      currentA: payload.pack_current_a,
      powerFactor: 1.0,
      frequencyHz: 50.0,
      socPercent: payload.soc_percent,
      carbonGramsPerKwh: 0,
      recordedAt: payload.ts || new Date().toISOString(),
      institutionId: payload.institution_id || 'global',
    };
  }
}
