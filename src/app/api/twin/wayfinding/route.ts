import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { wayfindingRouteSchema } from '@/lib/validation/twin-schemas';
import { SpatialGraphEngine } from '@/lib/operations/twin/wayfinding/spatial-graph-engine';
import { TwinDbStore } from '@/lib/db/twin-store';

const store = TwinDbStore.getInstance();
const graphEngine = new SpatialGraphEngine();

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = wayfindingRouteSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { facilityId, sourceNodeId, targetNodeId, requireStepFree, institutionId } = parse.data;
    const tenantId = institutionId || user?.institutionId || 'global';

    // Populate graph with DB nodes & edges
    const dbNodes = await store.listWayfindingNodes(tenantId, facilityId);
    const dbEdges = await store.listWayfindingEdges(tenantId, facilityId);

    graphEngine.clear();
    for (const n of dbNodes) {
      let coords = { x: 0, y: 0, z: 0 };
      try { coords = JSON.parse(n.coordinatesJson); } catch {}
      graphEngine.addNode({
        id: n.nodeId,
        floorLevel: n.floorLevel,
        coordinates: coords,
        isAccessible: n.isAccessible,
        isExit: n.isExit,
        type: n.nodeType as any,
      });
    }

    for (const e of dbEdges) {
      graphEngine.addEdge({
        id: e.edgeId,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        distanceMeters: e.distanceMeters,
        transitTimeSeconds: e.transitTimeSeconds,
        isStepFree: e.isStepFree,
        isBlocked: e.isBlocked,
        hazardLevel: e.hazardLevel,
      });
    }

    // Default sample fallback if DB has no nodes yet
    if (dbNodes.length === 0) {
      graphEngine.addNode({ id: sourceNodeId, floorLevel: 0, coordinates: { x: 0, y: 0, z: 0 } });
      graphEngine.addNode({ id: targetNodeId, floorLevel: 0, coordinates: { x: 25, y: 0, z: 0 } });
      graphEngine.addEdge({ id: 'sample_edge', source: sourceNodeId, target: targetNodeId, distanceMeters: 25 });
    }

    const route = graphEngine.findRoute(facilityId, sourceNodeId, targetNodeId, {
      requireStepFree,
      avoidBlocked: true,
    });

    if (!route) {
      return NextResponse.json({ error: 'No reachable route found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, route }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Wayfinding calculation failed' }, { status: 500 });
  }
}, 'twin:facilities:read');
