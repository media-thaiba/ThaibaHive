import { EnergyTelemetryIngester } from '../../../operations/eco/telemetry/energy-telemetry-ingester';
import { EnergyProtocolAdapters } from '../../../operations/eco/telemetry/energy-protocol-adapters';
import { TimeSeriesRollup } from '../../../operations/eco/telemetry/time-series-rollup';
import { EcoDbStore } from '../../../db/eco-store';

describe('EnergyTelemetryIngester & Protocol Adapters & TimeSeriesRollup', () => {
  let ingester: EnergyTelemetryIngester;
  let store: EcoDbStore;

  beforeEach(() => {
    store = EcoDbStore.getInstance();
    store.clearMemoryStore();
    ingester = new EnergyTelemetryIngester(store);
  });

  it('should parse SunSpec Modbus solar payload correctly', () => {
    const rawSunSpec = {
      deviceId: 'inv_solar_01',
      model: 103,
      watts: 12500, // 12.5 kW
      volts: 480,
      amps: 26,
      hz: 60.0,
      wHoursTotal: 4500000, // 4,500 kWh
      institutionId: 'inst_alpha',
    };

    const parsed = EnergyProtocolAdapters.parseSunSpecPayload(rawSunSpec);
    expect(parsed.assetId).toBe('inv_solar_01');
    expect(parsed.sourceType).toBe('solar_pv');
    expect(parsed.powerKw).toBe(12.5);
    expect(parsed.energyKwh).toBe(4500);
    expect(parsed.carbonGramsPerKwh).toBe(0);
  });

  it('should parse MQTT Smart Meter payload and deduplicate duplicate packets', async () => {
    const timestamp = '2026-08-21T08:00:00.000Z';
    const packet = EnergyProtocolAdapters.parseMqttSmartMeter({
      meter_id: 'meter_main_01',
      active_power_kw: 85.4,
      cumulative_kwh: 12450.0,
      l1_voltage: 400.2,
      l1_current: 123.5,
      pf: 0.98,
      freq: 50.0,
      grid_carbon_intensity: 340.0,
      ts: timestamp,
      tenant_id: 'inst_alpha',
    });

    const res1 = await ingester.ingest(packet);
    expect(res1.status).toBe('accepted');

    // Second ingestion of same packet should be flagged as duplicate
    const res2 = await ingester.ingest(packet);
    expect(res2.status).toBe('duplicate');
  });

  it('should perform 15-minute time-series rollups accurately', () => {
    const points = [];
    const baseTime = new Date('2026-08-21T08:00:00.000Z').getTime();

    // 15 samples across 15 minutes (1 per minute)
    for (let i = 0; i < 15; i++) {
      points.push({
        telemetryId: `t_${i}`,
        assetId: 'meter_main_01',
        sourceType: 'smart_meter' as const,
        powerKw: 100 + i * 2, // 100 kW to 128 kW
        energyKwh: 1000 + i * 2,
        voltageV: 400,
        currentA: 150,
        powerFactor: 0.98,
        frequencyHz: 50.0,
        carbonGramsPerKwh: 350,
        recordedAt: new Date(baseTime + i * 60 * 1000).toISOString(),
        institutionId: 'inst_alpha',
      });
    }

    const rollups = TimeSeriesRollup.aggregate(points, 15);
    expect(rollups).toHaveLength(1);
    expect(rollups[0].sampleCount).toBe(15);
    expect(rollups[0].minPowerKw).toBe(100);
    expect(rollups[0].peakPowerKw).toBe(128);
    expect(rollups[0].avgPowerKw).toBe(114); // average of 100..128 = 114
    expect(rollups[0].totalEnergyKwh).toBeCloseTo(114 * 0.25, 2); // 28.5 kWh
  });

  it('should calculate live instantaneous campus microgrid power snapshot', async () => {
    // Register assets
    await store.createEnergyAsset({
      assetId: 'solar_01',
      facilityId: 'fac_main',
      name: 'Rooftop Solar',
      assetType: 'solar_inverter',
      institutionId: 'inst_alpha',
    });
    await store.createEnergyAsset({
      assetId: 'meter_01',
      facilityId: 'fac_main',
      name: 'Main Building Meter',
      assetType: 'smart_meter',
      institutionId: 'inst_alpha',
    });

    // Ingest latest telemetry
    await ingester.ingest({
      telemetryId: 't_s1',
      assetId: 'solar_01',
      sourceType: 'solar_pv',
      powerKw: 150, // 150 kW solar
      energyKwh: 500,
      voltageV: 480,
      currentA: 180,
      powerFactor: 1.0,
      frequencyHz: 60.0,
      carbonGramsPerKwh: 0,
      recordedAt: new Date().toISOString(),
      institutionId: 'inst_alpha',
    });

    await ingester.ingest({
      telemetryId: 't_m1',
      assetId: 'meter_01',
      sourceType: 'smart_meter',
      powerKw: 100, // 100 kW demand
      energyKwh: 1200,
      voltageV: 400,
      currentA: 150,
      powerFactor: 0.98,
      frequencyHz: 60.0,
      carbonGramsPerKwh: 350,
      recordedAt: new Date().toISOString(),
      institutionId: 'inst_alpha',
    });

    const snapshot = await ingester.getCampusPowerSnapshot('inst_alpha');
    expect(snapshot.solarGenerationKw).toBe(150);
    expect(snapshot.campusFacilityLoadKw).toBe(100);
    expect(snapshot.gridExportKw).toBe(50); // 150 - 100 = 50 kW export
    expect(snapshot.gridImportKw).toBe(0);
  });
});
