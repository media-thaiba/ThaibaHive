#!/usr/bin/env ts-node
/**
 * AIMS Multi-Agent Smart Campus End-to-End Simulation Runner CLI
 * Sprint-043 (AIMS / AutoOps) — AIMS-024
 */

import { MarlEngine } from '../../src/lib/operations/marl/marl-engine';
import { HvacOptimizer } from '../../src/lib/operations/energy/hvac-optimizer';
import { VehicleRoutingEngine } from '../../src/lib/operations/fleet/vehicle-routing-engine';
import { EdgeVerificationEngine } from '../../src/lib/operations/biometrics/edge-verification-engine';
import { ZkBiometricCircuits } from '../../src/lib/operations/biometrics/zk-biometric-circuits';
import { ZkBiometricVerifier } from '../../src/lib/operations/biometrics/zk-biometric-verifier';
import { CloudCostOptimizer } from '../../src/lib/operations/cloud/cloud-cost-optimizer';
import { CarbonCalculator } from '../../src/lib/operations/sustainability/carbon-calculator';
import { CampusResourceBroker } from '../../src/lib/operations/mesh/campus-resource-broker';
import { AimsAuditTrail } from '../../src/lib/operations/persistence/aims-audit-events';
import { AimsMetricsTracker } from '../../src/lib/operations/persistence/aims-metrics';

export async function runAimsSimulation(isDryRun = false) {
  console.log('===============================================================');
  console.log('  THAIBALIVE AIMS / AUTO-OPS MULTI-AGENT SIMULATION HARNESS');
  console.log('===============================================================');
  console.log(`[INIT] Running simulation (dryRun: ${isDryRun})...\n`);

  // 1. MARL Engine
  const marl = new MarlEngine();
  marl.registerAgent('agent_energy', 'hvac_energy');
  marl.registerAgent('agent_fleet', 'fleet_logistics');
  const marlStep = marl.coordinateJointDecision({
    step: 1,
    timestamp: new Date().toISOString(),
    institutionId: 'inst_001',
    observations: {
      agent_energy: {
        agentId: 'agent_energy',
        domain: 'hvac_energy',
        stateVector: [22.5, 55, 450, 18.0, 32.0, 65, 0.14, 0.8],
        features: { temperature: 22.5 },
        timestamp: new Date().toISOString(),
        institutionId: 'inst_001',
        campusId: 'campus_main',
      },
      agent_fleet: {
        agentId: 'agent_fleet',
        domain: 'fleet_logistics',
        stateVector: [0, 15000, 0.92, 85, 12, 33, 0, 25],
        features: { speed: 0 },
        timestamp: new Date().toISOString(),
        institutionId: 'inst_001',
        campusId: 'campus_main',
      },
    },
    globalStateVector: [22.5, 55, 450, 18.0, 32.0, 65, 0.14, 0.8],
  });
  console.log(`[MARL] Dispatched step joint value estimate: ${marlStep.jointValueEstimate.toFixed(4)}`);

  // 2. HVAC Optimization
  const hvac = new HvacOptimizer();
  const hvacRes = hvac.optimizeZoneSetpoint(
    {
      sensorId: 'sensor_hall_a',
      campusId: 'campus_main',
      buildingId: 'bld_science',
      zoneId: 'hall_a',
      temperatureCelsius: 21.5,
      relativeHumidityPercent: 55,
      co2Ppm: 480,
      luxLevel: 400,
      powerKw: 22.0,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    },
    {
      campusId: 'campus_main',
      buildingId: 'bld_science',
      zoneId: 'hall_a',
      forecastTimestamp: new Date().toISOString(),
      horizonMinutes: 15,
      predictedHeadcount: 45,
      confidenceInterval: [40, 50],
      occupancyRatio: 0.9,
    },
    false
  );
  console.log(`[HVAC] Optimal Setpoint: ${hvacRes.optimizedSetpointCelsius}°C (Energy Saved: ${hvacRes.projectedKwhSavings} kWh)`);

  // 3. Fleet Logistics Routing
  const router = new VehicleRoutingEngine();
  const route = router.optimizeRoute(
    {
      vehicleId: 'shuttle_e1',
      campusId: 'campus_main',
      vehicleType: 'SHUTTLE_BUS',
      latitude: 12.971,
      longitude: 77.594,
      speedKmph: 0,
      odometerKm: 15000,
      batterySoCRatio: 0.92,
      engineTempCelsius: 85,
      brakePadWearPercent: 12,
      tirePressurePsi: 33,
      passengerCount: 0,
      maxCapacity: 30,
      status: 'IDLE',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    },
    [
      {
        stopId: 'stop_1',
        name: 'Science Quad',
        latitude: 12.974,
        longitude: 77.597,
        estimatedArrivalIso: new Date().toISOString(),
        demandPickupCount: 12,
        dropoffCount: 0,
      },
      {
        stopId: 'stop_2',
        name: 'Sports Complex',
        latitude: 12.979,
        longitude: 77.601,
        estimatedArrivalIso: new Date().toISOString(),
        demandPickupCount: 8,
        dropoffCount: 0,
      },
    ]
  );
  console.log(`[FLEET] Route generated: ${route.stops.length} stops, ${route.totalDistanceKm} km (${route.totalDurationMinutes} mins)`);

  // 4. Edge Biometrics & ZKP Attestation
  const edgeEngine = new EdgeVerificationEngine();
  const templateVec = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.2));
  edgeEngine.getMatcher().registerTemplate({
    templateId: 'tmpl_std_1',
    userId: 'student_908',
    dimension: 128,
    vector: templateVec,
    enrolledAt: new Date().toISOString(),
    institutionId: 'inst_001',
  });
  const bioMatch = edgeEngine.verifyAttendance({
    campusId: 'campus_main',
    locationName: 'North Gate Kiosk',
    sessionId: 'session_01',
    queryEmbedding: templateVec,
    institutionId: 'inst_001',
  });
  const zkpVerifier = new ZkBiometricVerifier();
  const sessionRoot = 'merkle_root_sim_epoch_1';
  const proof = ZkBiometricCircuits.generateProof('student_908', 'session_01', 'inst_001', 1, sessionRoot);
  const zkpRes = zkpVerifier.verifyProof(proof, sessionRoot);
  console.log(`[BIOMETRICS] Edge Match: ${bioMatch.success} (${bioMatch.latencyMs}ms), ZKP Verified: ${zkpRes.valid}`);

  // 5. Cloud Cost & Carbon Calculation
  const cloudOpt = new CloudCostOptimizer();
  const cloudRec = cloudOpt.analyzeResource({
    resourceId: 'i-batch-1',
    provider: 'AWS',
    region: 'ap-south-1',
    instanceType: 'm5.2xlarge',
    clusterName: 'batch-compute',
    environment: 'staging',
    cpuUtilizationPercent: 10,
    memoryUtilizationPercent: 20,
    currentMonthlyCostDollars: 300,
    isSpotInstance: false,
    timestamp: new Date().toISOString(),
    institutionId: 'inst_001',
  });
  const carbonCalc = new CarbonCalculator();
  const emissions = carbonCalc.calculateEmissions({
    fuelLitersConsumed: 500,
    gridElectricityKwh: 20000,
    cloudComputeCoreHours: 8000,
  });
  console.log(`[CLOUD/ESG] Cloud Rightsizing Savings: $${cloudRec?.monthlySavingsDollars}/mo, Total Scope Emissions: ${emissions.totalKgCo2e} kg CO2e`);

  // 6. Cross-Campus Resource Mesh
  const meshBroker = new CampusResourceBroker();
  meshBroker.registerResource({
    resourceId: 'res_hpc_1',
    campusId: 'campus_main',
    name: 'Shared HPC Compute Node',
    category: 'COMPUTE_CLUSTER',
    capacityUnits: 32,
    isShareableCrossCampus: true,
    hourlyCostRateDollars: 50,
    activeReservations: [],
    institutionId: 'inst_001',
  });
  const booking = meshBroker.bookResource({
    reservationId: 'res_sim_1',
    resourceId: 'res_hpc_1',
    requestingCampusId: 'campus_south',
    hostCampusId: 'campus_main',
    reservedByUserId: 'user_prof_smith',
    startTimeIso: '2026-08-20T10:00:00Z',
    endTimeIso: '2026-08-20T12:00:00Z',
    unitsReserved: 16,
    status: 'CONFIRMED',
    lamportTimestamp: 1,
  });
  console.log(`[MESH] Cross-Campus Booking: ${booking.success} for resource ${booking.reservation?.resourceId}`);

  // 7. Cryptographic Merkle Audit Trail
  const audit = new AimsAuditTrail();
  audit.emitEvent('AIMS_ENERGY_OPTIMIZED', 'agent_energy', 'campus_main', 'inst_001', { kwh: hvacRes.projectedKwhSavings });
  audit.emitEvent('AIMS_FLEET_DISPATCHED', 'agent_fleet', 'campus_main', 'inst_001', { routeId: route.routeId });
  const auditValid = audit.verifyChainIntegrity();
  console.log(`[AUDIT] Merkle Chain Blocks: ${audit.getBlockCount()}, Continuity Valid: ${auditValid}`);

  // 8. OpenMetrics Export
  const metrics = AimsMetricsTracker.getInstance();
  metrics.recordEnergySaved('campus_main', 'bld_science', hvacRes.projectedKwhSavings);
  metrics.setMarlCoordinationScore('hvac_energy', 0.95);
  const metricsExport = metrics.exportOpenMetrics();
  console.log(`[METRICS] OpenMetrics Telemetry lines exported: ${metricsExport.split('\n').length}`);

  console.log('\n===============================================================');
  console.log('  [SUCCESS] ALL AIMS AUTONOMOUS OPERATIONAL AGENTS SIMULATED  ');
  console.log('===============================================================');

  return {
    success: true,
    marlStep,
    hvacRes,
    route,
    bioMatch,
    zkpRes,
    cloudRec,
    emissions,
    booking,
    auditValid,
  };
}

if (require.main === module) {
  runAimsSimulation(process.argv.includes('--dry-run')).catch((err) => {
    console.error('[SIMULATION ERROR]', err);
    process.exit(1);
  });
}
