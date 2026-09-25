import { EcoDbStore } from '../../db/eco-store';

describe('EcoDbStore Unit Tests', () => {
  let store: EcoDbStore;

  beforeEach(() => {
    store = EcoDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve energy assets with multi-tenant isolation', async () => {
    await store.createEnergyAsset({
      assetId: 'asset_pv_01',
      facilityId: 'fac_main',
      name: 'Main Campus Solar Array',
      assetType: 'solar_inverter',
      status: 'online',
      capacityKw: 250,
      ratedVoltage: 480,
      specificationsJson: JSON.stringify({ inverterModel: 'SMA Sunny Tripower 25000TL' }),
      institutionId: 'inst_alpha',
    });

    const asset = await store.getEnergyAssetById('asset_pv_01', 'inst_alpha');
    expect(asset).toBeDefined();
    expect(asset.name).toBe('Main Campus Solar Array');
    expect(asset.capacityKw).toBe(250);

    // Cross-tenant check should return null
    const crossTenant = await store.getEnergyAssetById('asset_pv_01', 'inst_beta');
    expect(crossTenant).toBeNull();
  });

  it('should manage generation sources and storage batteries', async () => {
    await store.createGenerationSource({
      sourceId: 'gen_solar_01',
      assetId: 'asset_pv_01',
      name: 'Rooftop Solar Array North',
      sourceType: 'solar_pv',
      peakCapacityKw: 150,
      efficiencyPercent: 22.0,
      tiltAngle: 18.0,
      azimuthAngle: 180.0,
      locationJson: JSON.stringify({ building: 'Engineering Hall', roofSection: 'North' }),
      institutionId: 'inst_alpha',
    });

    await store.createStorageBattery({
      batteryId: 'bat_bess_01',
      assetId: 'asset_bess_01',
      name: 'Campus Central BESS',
      chemistry: 'lfp',
      capacityKwh: 1000,
      maxPowerKw: 500,
      currentSoCPercent: 75,
      minSoCPercent: 20,
      maxSoCPercent: 90,
      cycleCount: 142,
      healthStatus: 'excellent',
      dispatchMode: 'arbitrage',
      institutionId: 'inst_alpha',
    });

    const genSources = await store.listGenerationSources('inst_alpha');
    expect(genSources).toHaveLength(1);
    expect(genSources[0].peakCapacityKw).toBe(150);

    const batteries = await store.listStorageBatteries('inst_alpha');
    expect(batteries).toHaveLength(1);
    expect(batteries[0].capacityKwh).toBe(1000);

    // Update battery SoC
    const updatedBattery = await store.updateStorageBattery(
      'bat_bess_01',
      { currentSoCPercent: 82, dispatchMode: 'peak_shaving' },
      'inst_alpha'
    );
    expect(updatedBattery.currentSoCPercent).toBe(82);
    expect(updatedBattery.dispatchMode).toBe('peak_shaving');
  });

  it('should record and query high-frequency energy telemetry', async () => {
    const now = new Date().toISOString();
    await store.recordEnergyTelemetry({
      telemetryId: 'telem_001',
      assetId: 'asset_pv_01',
      sourceType: 'solar_pv',
      powerKw: 142.5,
      energyKwh: 450.2,
      voltageV: 400.1,
      currentA: 205.6,
      powerFactor: 0.99,
      frequencyHz: 50.02,
      carbonGramsPerKwh: 0.0,
      recordedAt: now,
      institutionId: 'inst_alpha',
    });

    const telemetryList = await store.queryEnergyTelemetry('asset_pv_01', undefined, undefined, 10, 'inst_alpha');
    expect(telemetryList).toHaveLength(1);
    expect(telemetryList[0].powerKw).toBe(142.5);
  });

  it('should record carbon emissions and manage ESG reports & offsets', async () => {
    await store.recordCarbonEmission({
      emissionId: 'em_001',
      facilityId: 'fac_main',
      departmentId: 'dept_engineering',
      scope: 'scope_2',
      category: 'electricity',
      quantity: 1200,
      unit: 'kWh',
      emissionFactor: 0.35,
      co2EquivalentKg: 420,
      activityDate: '2026-08-21',
      isOffset: false,
      auditHash: 'sha256-mock-hash-1',
      institutionId: 'inst_alpha',
    });

    await store.createCarbonOffset({
      offsetId: 'off_001',
      certificateNumber: 'VCS-2026-987654',
      registry: 'verra_vcs',
      offsetType: 'reforestation',
      vintageYear: 2025,
      quantityTonsCo2e: 50,
      costPerTon: 22.5,
      status: 'active',
      institutionId: 'inst_alpha',
    });

    await store.createEsgReport({
      reportId: 'esg_2026_q2',
      title: 'Q2 2026 Sustainability & ESG Disclosure',
      reportingPeriod: '2026-Q2',
      framework: 'ghg_protocol_gri305',
      scope1TotalKg: 12500,
      scope2LocationKg: 45000,
      scope2MarketKg: 32000,
      scope3TotalKg: 18000,
      netEmissionsKg: 42500,
      recOffsetsDeductedKg: 20000,
      merkleRoot: '0x123abc456def',
      status: 'published',
      institutionId: 'inst_alpha',
    });

    const emissions = await store.listCarbonEmissions('inst_alpha', 'fac_main', 'scope_2');
    expect(emissions).toHaveLength(1);
    expect(emissions[0].co2EquivalentKg).toBe(420);

    const offsets = await store.listCarbonOffsets('inst_alpha');
    expect(offsets).toHaveLength(1);
    expect(offsets[0].quantityTonsCo2e).toBe(50);

    const reports = await store.listEsgReports('inst_alpha');
    expect(reports).toHaveLength(1);
    expect(reports[0].netEmissionsKg).toBe(42500);
  });

  it('should manage EV charging stations and fleet sessions', async () => {
    await store.createEvChargingStation({
      stationId: 'evs_01',
      facilityId: 'fac_main',
      name: 'North Gate Fast Charger 1',
      ocppId: 'OCPP-CP-001',
      connectorType: 'type2_combo_ccs',
      maxPowerKw: 150,
      status: 'available',
      currentPowerKw: 0,
      isV2GEnabled: true,
      firmwareVersion: 'v2.0.1',
      institutionId: 'inst_alpha',
    });

    await store.createEvFleetSession({
      sessionId: 'ses_01',
      stationId: 'evs_01',
      vehicleId: 'veh_bus_04',
      vehicleType: 'bus',
      sessionType: 'smart_charge',
      startSoCPercent: 35,
      currentSoCPercent: 60,
      targetSoCPercent: 90,
      energyDeliveredKwh: 45,
      energyDischargedKwh: 0,
      status: 'active',
      institutionId: 'inst_alpha',
    });

    const stations = await store.listEvChargingStations('inst_alpha');
    expect(stations).toHaveLength(1);
    expect(stations[0].isV2GEnabled).toBe(true);

    const sessions = await store.listEvFleetSessions('inst_alpha', 'evs_01', 'active');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].currentSoCPercent).toBe(60);
  });
});
