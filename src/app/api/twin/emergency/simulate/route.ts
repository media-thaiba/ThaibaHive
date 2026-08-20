import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { emergencySimulateSchema } from '@/lib/validation/twin-schemas';
import { SpatialGraphEngine } from '@/lib/operations/twin/wayfinding/spatial-graph-engine';
import { EmergencyEvacuationRouter } from '@/lib/operations/twin/wayfinding/emergency-evacuation-router';
import { TwinMetrics } from '@/lib/operations/twin/telemetry/twin-metrics';

const graphEngine = new SpatialGraphEngine();
const emergencyRouter = new EmergencyEvacuationRouter(graphEngine);
const metrics = TwinMetrics.getInstance();

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = emergencySimulateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { facilityId, hazardType, blockedNodeIds, blockedEdgeIds, headcountsPerNode, institutionId } = parse.data;
    const tenantId = institutionId || user?.institutionId || 'global';

    // Setup base evacuation graph if empty
    if (graphEngine.getExitNodes().length === 0) {
      graphEngine.addNode({ id: 'RM-101', floorLevel: 0, coordinates: { x: 0, y: 0, z: 0 } });
      graphEngine.addNode({ id: 'RM-102', floorLevel: 0, coordinates: { x: 10, y: 0, z: 0 } });
      graphEngine.addNode({ id: 'EXIT-EAST', floorLevel: 0, coordinates: { x: 25, y: 0, z: 0 }, isExit: true });
      graphEngine.addNode({ id: 'EXIT-WEST', floorLevel: 0, coordinates: { x: -25, y: 0, z: 0 }, isExit: true });

      graphEngine.addEdge({ id: 'E_EAST_1', source: 'RM-101', target: 'EXIT-EAST', distanceMeters: 25 });
      graphEngine.addEdge({ id: 'E_EAST_2', source: 'RM-102', target: 'EXIT-EAST', distanceMeters: 15 });
      graphEngine.addEdge({ id: 'E_WEST_1', source: 'RM-101', target: 'EXIT-WEST', distanceMeters: 25 });
      graphEngine.addEdge({ id: 'E_WEST_2', source: 'RM-102', target: 'EXIT-WEST', distanceMeters: 35 });
    }

    if (hazardType !== 'none' && blockedEdgeIds.length > 0) {
      emergencyRouter.declareHazard({
        hazardId: `HAZ_${Date.now()}`,
        facilityId,
        hazardType,
        blockedNodeIds,
        blockedEdgeIds,
        declaredAt: new Date().toISOString(),
      });
    }

    const counts: Record<string, number> = Object.keys(headcountsPerNode).length > 0
      ? (headcountsPerNode as Record<string, number>)
      : { 'RM-101': 30, 'RM-102': 20 };

    const result = emergencyRouter.computeAllEvacuationRoutesAndSimulate(facilityId, counts);
    metrics.setEvacuationCalcDuration(tenantId, result.calculationTimeMs / 1000);

    const routesObject: Record<string, any> = {};
    for (const [nodeId, route] of result.routes.entries()) {
      routesObject[nodeId] = route;
    }

    return NextResponse.json(
      {
        success: true,
        facilityId,
        hazardType,
        calculationTimeMs: result.calculationTimeMs,
        simulationReport: result.simulationReport,
        routes: routesObject,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Emergency simulation failed' }, { status: 500 });
  }
}, 'twin:emergency:trigger');
