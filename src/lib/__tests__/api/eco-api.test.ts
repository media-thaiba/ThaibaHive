import { GET as getAssets, POST as postAssets } from '../../../app/api/eco/assets/route';
import { POST as postTelemetry } from '../../../app/api/eco/telemetry/ingest/route';
import { GET as getLivePower } from '../../../app/api/eco/telemetry/live/route';
import { POST as postOptimize } from '../../../app/api/eco/microgrid/optimize/route';
import { POST as postCalculate } from '../../../app/api/eco/carbon/calculate/route';
import { POST as postDispatch } from '../../../app/api/eco/ev/dispatch/route';
import { GET as getOffsets, POST as postOffsets } from '../../../app/api/eco/offsets/route';
import { GET as getReports, POST as postReports } from '../../../app/api/eco/reports/esg/route';
import { EcoDbStore } from '../../db/eco-store';

describe('ECO-MESH REST API Endpoints Unit Tests', () => {
  beforeEach(() => {
    EcoDbStore.getInstance().clearMemoryStore();
  });

  it('should create and list energy assets via /api/eco/assets', async () => {
    const postReq = new Request('http://localhost/api/eco/assets', {
      method: 'POST',
      body: JSON.stringify({
        assetId: 'asset_inv_01',
        facilityId: 'fac_main',
        name: 'Science Hall Solar Inverter',
        assetType: 'solar_inverter',
        capacityKw: 150,
        institutionId: 'inst_alpha',
      }),
    });

    const postRes = await postAssets(postReq as any);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.asset.name).toBe('Science Hall Solar Inverter');

    const getReq = new Request('http://localhost/api/eco/assets?tenantId=inst_alpha');
    const getRes = await getAssets(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.assets).toHaveLength(1);
  });

  it('should ingest energy telemetry and retrieve live snapshot', async () => {
    const ingestReq = new Request('http://localhost/api/eco/telemetry/ingest', {
      method: 'POST',
      body: JSON.stringify({
        assetId: 'asset_inv_01',
        sourceType: 'solar_pv',
        powerKw: 120.5,
        energyKwh: 450,
        institutionId: 'inst_alpha',
      }),
    });

    const ingestRes = await postTelemetry(ingestReq as any);
    expect(ingestRes.status).toBe(200);

    const liveReq = new Request('http://localhost/api/eco/telemetry/live?tenantId=inst_alpha');
    const liveRes = await getLivePower(liveReq as any);
    expect(liveRes.status).toBe(200);
    const liveData = await liveRes.json();
    expect(liveData.snapshot).toBeDefined();
  });

  it('should execute microgrid optimization via /api/eco/microgrid/optimize', async () => {
    const optReq = new Request('http://localhost/api/eco/microgrid/optimize', {
      method: 'POST',
      body: JSON.stringify({
        hourlyLoadKw: [40, 38, 36, 35, 38, 55, 90, 140, 180, 210, 230, 240, 235, 230, 250, 260, 245, 220, 180, 140, 95, 70, 50, 42],
        hourlySolarGenKw: [0, 0, 0, 0, 0, 0, 20, 65, 120, 180, 220, 240, 235, 210, 160, 95, 40, 10, 0, 0, 0, 0, 0, 0],
        bessCapacityKwh: 500,
        bessMaxPowerKw: 250,
      }),
    });

    const optRes = await postOptimize(optReq as any);
    expect(optRes.status).toBe(200);
    const optData = await optRes.json();
    expect(optData.optimization.savingsPercentage).toBeGreaterThanOrEqual(15.0);
  });

  it('should calculate carbon emissions batch via /api/eco/carbon/calculate', async () => {
    const calcReq = new Request('http://localhost/api/eco/carbon/calculate', {
      method: 'POST',
      body: JSON.stringify({
        inputs: [
          {
            facilityId: 'fac_main',
            scope: 'scope_1',
            category: 'stationary_combustion',
            fuelOrSource: 'diesel_generator',
            quantity: 100,
            unit: 'liters',
            activityDate: '2026-08-21',
          },
        ],
        retiredOffsetsKg: 50,
      }),
    });

    const calcRes = await postCalculate(calcReq as any);
    expect(calcRes.status).toBe(200);
    const calcData = await calcRes.json();
    expect(calcData.result.breakdown.scope1Kg).toBeGreaterThan(200);
  });

  it('should dispatch EV fleet via /api/eco/ev/dispatch', async () => {
    const dispatchReq = new Request('http://localhost/api/eco/ev/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        vehicles: [
          {
            vehicleId: 'bus_01',
            vehicleType: 'bus',
            batteryCapacityKwh: 200,
            maxV2GDischargeKw: 50,
            maxChargeKw: 60,
            currentSoCPercent: 85,
            scheduledDepartureTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            requiredTripEnergyKwh: 80,
            targetDepartureSoCPercent: 85,
            isV2GApproved: true,
          },
        ],
        peakDeficitKw: 40,
        tariffRatePerKwh: 0.32,
      }),
    });

    const dispatchRes = await postDispatch(dispatchReq as any);
    expect(dispatchRes.status).toBe(200);
    const dispatchData = await dispatchRes.json();
    expect(dispatchData.dispatch.totalDischargePowerKw).toBe(40);
  });

  it('should manage carbon offsets via /api/eco/offsets and create ESG reports via /api/eco/reports/esg', async () => {
    const offsetReq = new Request('http://localhost/api/eco/offsets', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        offsetId: 'off_001',
        certificateNumber: 'VCS-2026-001',
        quantityTonsCo2e: 50,
        institutionId: 'inst_alpha',
      }),
    });

    const offsetRes = await postOffsets(offsetReq as any);
    expect(offsetRes.status).toBe(201);

    const reportReq = new Request('http://localhost/api/eco/reports/esg', {
      method: 'POST',
      body: JSON.stringify({
        reportId: 'esg_2026_q2',
        title: 'Q2 2026 ESG Report',
        reportingPeriod: '2026-Q2',
        scope1TotalKg: 5000,
        scope2LocationKg: 20000,
        scope3TotalKg: 8000,
        netEmissionsKg: 33000,
        institutionId: 'inst_alpha',
      }),
    });

    const reportRes = await postReports(reportReq as any);
    expect(reportRes.status).toBe(201);
  });
});
