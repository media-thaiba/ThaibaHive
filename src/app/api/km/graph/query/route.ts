import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmGraphQuerySchema } from '@/lib/validation/km-schemas';
import { campusGraph } from '@/lib/operations/km/graph/knowledge-graph-engine';

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = kmGraphQuerySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { startNodeId, maxHops, filterRelation } = parse.data;
    const paths = campusGraph.traverseMultiHop(startNodeId, maxHops, filterRelation);
    const startNode = campusGraph.getNode(startNodeId);

    return NextResponse.json({
      success: true,
      startNode,
      totalPaths: paths.length,
      paths,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Graph query execution failed' }, { status: 500 });
  }
}, 'km:knowledge:search');
