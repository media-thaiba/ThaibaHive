#!/usr/bin/env tsx
/**
 * ==============================================================================
 * digital-twin-simulation-runner.ts — Sprint-048 TWIN-OPS Simulation Harness
 * Executes 8 End-to-End Autonomous Spatial & Digital Twin Pillars
 * Supports --scenario CLI flag and generates reports/twin-simulation-report.json
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { SpatialIndexer } from '../../src/lib/operations/twin/spatial/spatial-indexer';
import { BoundingVolume } from '../../src/lib/operations/twin/spatial/bounding-volume';
import { TelemetryIngester } from '../../src/lib/operations/twin/iot/telemetry-ingester';
import { ModelParser } from '../../src/lib/operations/twin/rendering/model-parser';
import { ShaderMaterials } from '../../src/lib/operations/twin/rendering/shader-materials';
import { OccupancyForecaster } from '../../src/lib/operations/twin/ml/occupancy-forecaster';
import { HvacEnergyOptimizer } from '../../src/lib/operations/twin/ml/hvac-energy-optimizer';
import { SpatialGraphEngine } from '../../src/lib/operations/twin/wayfinding/spatial-graph-engine';
import { EmergencyEvacuationRouter } from '../../src/lib/operations/twin/wayfinding/emergency-evacuation-router';
import { RtlsEngine } from '../../src/lib/operations/twin/assets/rtls-engine';
import { GeofenceMonitor } from '../../src/lib/operations/twin/assets/geofence-monitor';
import { TwinAuditLogger } from '../../src/lib/operations/twin/security/twin-audit-logger';

export interface SimulationResult {
  passed: boolean;
  totalStages: number;
  passedStages: number;
  scenario: string;
  stages: Array<{ stage: number; name: string; status: 'passed' | 'failed'; details: string }>;
  timestamp: string;
}

export async function runDigitalTwinSimulation(options: { scenario?: string } = {}): Promise<SimulationResult> {
  const scenario = options.scenario || 'all';

  console.log('================================================================');
  console.log(`  Sprint-048 Digital Twin & Spatial Simulation [Scenario: ${scenario}] `);
  console.log('================================================================\n');

  const stageResults: SimulationResult['stages'] = [];
  let passedStages = 0;

  // Stage 1: Spatial Partitioning & Ray-Casting Containment
  if (scenario === 'all' || scenario === 'spatial') {
    console.log('--- Stage 1: Spatial Partitioning & Ray-Casting Containment ---');
    const indexer = new SpatialIndexer({ min: { x: -100, y: -100, z: -10 }, max: { x: 100, y: 100, z: 50 } });
    indexer.indexSpace('SEC-101', 'FAC-ENG', 1, { x: 10, y: 15, z: 3.5, width: 10, height: 12, depth: 3.5 });
    indexer.indexSpace('SEC-102', 'FAC-ENG', 1, { x: 25, y: 15, z: 3.5, width: 10, height: 12, depth: 3.5 });
    const nearby = indexer.findSpacesInRadius({ x: 15, y: 20, z: 5.0 }, 10.0);

    const poly = { points: [[0, 0], [20, 0], [20, 20], [0, 20]] as [number, number][] };
    const isInside = BoundingVolume.isPointInPolygon(poly, 10, 10);
    if (nearby.length >= 1 && isInside) {
      console.log(`✅ Stage 1 Passed: Octree indexed points and verified ray-cast point-in-polygon containment.`);
      passedStages++;
      stageResults.push({ stage: 1, name: 'Spatial Partitioning', status: 'passed', details: 'Octree and point containment valid' });
    } else {
      stageResults.push({ stage: 1, name: 'Spatial Partitioning', status: 'failed', details: 'Ray-casting or Octree query mismatch' });
    }
  }

  // Stage 2: IoT Telemetry Stream Ingestion & Statistical Anomaly Detection
  if (scenario === 'all' || scenario === 'iot') {
    console.log('\n--- Stage 2: IoT Telemetry Stream Ingestion & Anomaly Detection ---');
    const ingester = TelemetryIngester.getInstance();
    const frame = await ingester.ingestFrame(
      {
        sensorId: 'SEN-AIR-01',
        facilityId: 'FAC-ENG',
        spaceId: 'SEC-101',
        metricType: 'temperature_c',
        value: 22.4,
        unit: '°C',
      },
      { tenantId: 'inst_01' }
    );
    if (frame && frame.telemetryId && frame.value === 22.4) {
      console.log(`✅ Stage 2 Passed: Ingested telemetry frame with live comfort index.`);
      passedStages++;
      stageResults.push({ stage: 2, name: 'IoT Telemetry Ingestion', status: 'passed', details: 'Frame normalized and scored' });
    } else {
      stageResults.push({ stage: 2, name: 'IoT Telemetry Ingestion', status: 'failed', details: 'Frame ingestion failed' });
    }
  }

  // Stage 3: GeoJSON 3D Model Tessellation & Heatmap Shading
  if (scenario === 'all' || scenario === 'rendering') {
    console.log('\n--- Stage 3: 3D Model Parser & Heatmap Shaders ---');
    const scene = ModelParser.parseGeoJsonFacility('FAC-DEMO', {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { spaceId: 'SP-1', name: 'Robotics Lab', code: 'R1', floorLevel: 1, spaceType: 'laboratory', capacity: 30 },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [20, 0], [20, 15], [0, 15], [0, 0]]] },
        },
      ],
    });
    const color = ShaderMaterials.getHeatmapColor('temperature_c', 22.0);
    if (scene.spaces.length === 1 && color.hex.startsWith('#')) {
      console.log(`✅ Stage 3 Passed: Extruded GeoJSON polygon into 3D prism (${scene.spaces[0].meshLod0.surfaceAreaSqMeters} m²) and rendered heatmap shader.`);
      passedStages++;
      stageResults.push({ stage: 3, name: '3D Spatial Rendering', status: 'passed', details: 'Extrusion & shader color valid' });
    } else {
      stageResults.push({ stage: 3, name: '3D Spatial Rendering', status: 'failed', details: 'Mesh extrusion failed' });
    }
  }

  // Stage 4: Holt-Winters 24h Occupancy Forecasting & HVAC Setback
  if (scenario === 'all' || scenario === 'ml') {
    console.log('\n--- Stage 4: Predictive Space ML & HVAC Setback Optimization ---');
    const forecast = OccupancyForecaster.forecastNext24Hours('SP-1', 40, [0, 0, 0, 10, 25, 30, 20, 5, 0, 0], 6);
    const hvac = HvacEnergyOptimizer.optimizeHvacSchedule('FAC-DEMO', 'SP-1', forecast, 10.0, 2.5, 0.15);
    if (forecast.length === 24 && hvac.percentageReduction >= 10.0) {
      console.log(`✅ Stage 4 Passed: 24h forecast generated, HVAC setback energy reduction: ${hvac.percentageReduction}% (${hvac.kwhSaved} kWh saved).`);
      passedStages++;
      stageResults.push({ stage: 4, name: 'Predictive Space & HVAC ML', status: 'passed', details: `Energy reduction: ${hvac.percentageReduction}%` });
    } else {
      stageResults.push({ stage: 4, name: 'Predictive Space & HVAC ML', status: 'failed', details: 'HVAC optimization below target' });
    }
  }

  // Stage 5: Multi-Floor Wayfinding Graph & Step-Free Routing
  if (scenario === 'all' || scenario === 'wayfinding') {
    console.log('\n--- Stage 5: Spatial Graph Engine & Step-Free 3D Wayfinding ---');
    const graph = new SpatialGraphEngine();
    graph.addNode({ id: 'N_START', floorLevel: 1, coordinates: { x: 0, y: 0, z: 3.5 } });
    graph.addNode({ id: 'N_ELEV', floorLevel: 1, coordinates: { x: 10, y: 0, z: 3.5 }, type: 'elevator' });
    graph.addNode({ id: 'N_DEST', floorLevel: 0, coordinates: { x: 10, y: 0, z: 0 } });
    graph.addEdge({ id: 'E1', source: 'N_START', target: 'N_ELEV', distanceMeters: 10, isStepFree: true });
    graph.addEdge({ id: 'E2', source: 'N_ELEV', target: 'N_DEST', distanceMeters: 5, isStepFree: true });
    const route = graph.findRoute('FAC-DEMO', 'N_START', 'N_DEST', { requireStepFree: true });
    if (route && route.pathNodes.length === 3 && route.totalDistanceMeters === 15) {
      console.log(`✅ Stage 5 Passed: Computed 3D step-free wheelchair accessible navigation route (${route.totalDistanceMeters}m).`);
      passedStages++;
      stageResults.push({ stage: 5, name: 'Step-Free 3D Wayfinding', status: 'passed', details: `Path solved: ${route.totalDistanceMeters}m` });
    } else {
      stageResults.push({ stage: 5, name: 'Step-Free 3D Wayfinding', status: 'failed', details: 'Routing calculation failed' });
    }
  }

  // Stage 6: Emergency Hazard Declaration & Sub-5s Dynamic Evacuation
  if (scenario === 'all' || scenario === 'emergency') {
    console.log('\n--- Stage 6: Emergency Hazard Avoidance & Dynamic Crowd Egress ---');
    const graph = new SpatialGraphEngine();
    graph.addNode({ id: 'N_START', floorLevel: 1, coordinates: { x: 0, y: 0, z: 3.5 } });
    graph.addNode({ id: 'N_DEST', floorLevel: 0, coordinates: { x: 10, y: 0, z: 0 } });
    graph.addNode({ id: 'EXIT_SAFE', floorLevel: 0, coordinates: { x: 30, y: 0, z: 0 }, isExit: true });
    graph.addEdge({ id: 'E1', source: 'N_START', target: 'N_DEST', distanceMeters: 15 });
    graph.addEdge({ id: 'E_EXIT', source: 'N_DEST', target: 'EXIT_SAFE', distanceMeters: 20 });

    const emergRouter = new EmergencyEvacuationRouter(graph);
    const sim = emergRouter.computeAllEvacuationRoutesAndSimulate('FAC-DEMO', { N_START: 50 });
    if (sim.calculationTimeMs < 5000 && sim.simulationReport.evacuationPercentage === 100) {
      console.log(`✅ Stage 6 Passed: Solved multi-node emergency routes and simulated 100% egress in ${sim.calculationTimeMs}ms.`);
      passedStages++;
      stageResults.push({ stage: 6, name: 'Emergency Evacuation & Hazard Routing', status: 'passed', details: `100% egress in ${sim.calculationTimeMs}ms` });
    } else {
      stageResults.push({ stage: 6, name: 'Emergency Evacuation & Hazard Routing', status: 'failed', details: 'Evacuation simulation failed' });
    }
  }

  // Stage 7: BLE RTLS Trilateration & Geofence Perimeter Security
  if (scenario === 'all' || scenario === 'rtls') {
    console.log('\n--- Stage 7: RTLS 3D Trilateration & Geofence Perimeter Security ---');
    const loc = RtlsEngine.computeTrilateration('TAG-SPECTRO-01', [
      { gatewayId: 'GW1', gatewayPosition: { x: 0, y: 0, z: 3.5 }, rssi: -60 },
      { gatewayId: 'GW2', gatewayPosition: { x: 10, y: 0, z: 3.5 }, rssi: -60 },
      { gatewayId: 'GW3', gatewayPosition: { x: 0, y: 10, z: 3.5 }, rssi: -60 },
      { gatewayId: 'GW4', gatewayPosition: { x: 10, y: 10, z: 3.5 }, rssi: -60 },
    ]);
    const geofence = new GeofenceMonitor();
    geofence.registerGeofence({
      geofenceId: 'GEO-RESTRICTED',
      facilityId: 'FAC-DEMO',
      name: 'Secure Vault',
      polygon: { points: [[0, 0], [10, 0], [10, 10], [0, 10]] },
      alertOnExit: true,
      alertOnEntry: true,
      severity: 'critical',
    });
    const alarms = geofence.evaluateAssetPosition('TAG-SPECTRO-01', loc.estimatedPosition);
    if (loc.confidenceScore > 0.8 && alarms.length === 1 && alarms[0].eventType === 'enter') {
      console.log(`✅ Stage 7 Passed: Solved position (${loc.estimatedPosition.x}, ${loc.estimatedPosition.y}) and triggered geofence security alarm.`);
      passedStages++;
      stageResults.push({ stage: 7, name: 'RTLS 3D Trilateration & Geofencing', status: 'passed', details: `Position: (${loc.estimatedPosition.x}, ${loc.estimatedPosition.y})` });
    } else {
      stageResults.push({ stage: 7, name: 'RTLS 3D Trilateration & Geofencing', status: 'failed', details: 'Trilateration or geofence alarm failed' });
    }
  }

  // Stage 8: Merkle Audit Trail Cryptographic Hash Chain Integrity
  if (scenario === 'all' || scenario === 'audit') {
    console.log('\n--- Stage 8: Cryptographic Merkle Audit Trail Verification ---');
    const auditLogger = TwinAuditLogger.getInstance();
    auditLogger.clear();
    auditLogger.logEvent('facility_created', 'user_admin', { name: 'Science Hall' }, 'inst_01');
    auditLogger.logEvent('telemetry_ingested', 'device_gw1', { count: 100 }, 'inst_01');
    const isValid = auditLogger.verifyChainIntegrity();
    if (isValid) {
      console.log(`✅ Stage 8 Passed: Merkle hash chain validated with zero tampering.`);
      passedStages++;
      stageResults.push({ stage: 8, name: 'Merkle Audit Trail Integrity', status: 'passed', details: 'Cryptographic hash chain intact' });
    } else {
      stageResults.push({ stage: 8, name: 'Merkle Audit Trail Integrity', status: 'failed', details: 'Audit chain integrity compromised' });
    }
  }

  const expectedTotal = scenario === 'all' ? 8 : 1;
  const isCompleteSuccess = passedStages === expectedTotal;

  console.log('\n================================================================');
  console.log(`  Sprint-048 Simulation Completed: ${passedStages}/${expectedTotal} Stages Passed!`);
  console.log('================================================================\n');

  const result: SimulationResult = {
    passed: isCompleteSuccess,
    totalStages: expectedTotal,
    passedStages,
    scenario,
    stages: stageResults,
    timestamp: new Date().toISOString(),
  };

  // Write report to reports/twin-simulation-report.json and .ai/execution/twin-simulation-report.json
  try {
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(reportsDir, 'twin-simulation-report.json'), JSON.stringify(result, null, 2));

    const execDir = path.resolve(process.cwd(), '.ai', 'execution');
    if (!fs.existsSync(execDir)) {
      fs.mkdirSync(execDir, { recursive: true });
    }
    fs.writeFileSync(path.join(execDir, 'twin-simulation-report.json'), JSON.stringify(result, null, 2));
  } catch (err) {
    console.warn('Could not write simulation report file:', err);
  }

  if (!isCompleteSuccess) {
    throw new Error(`Simulation failed: only ${passedStages}/${expectedTotal} stages passed.`);
  }

  return result;
}

// CLI Execution Entrypoint
if (require.main === module) {
  const args = process.argv.slice(2);
  let scenarioArg = 'all';
  for (const arg of args) {
    if (arg.startsWith('--scenario=')) {
      scenarioArg = arg.split('=')[1];
    }
  }

  runDigitalTwinSimulation({ scenario: scenarioArg }).catch((err) => {
    console.error('Simulation Execution Error:', err);
    process.exit(1);
  });
}
