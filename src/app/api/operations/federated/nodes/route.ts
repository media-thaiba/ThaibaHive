import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedNodeRegisterSchema } from '@/lib/validation/schemas';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedMetricsTracker } from '@/lib/operations/persistence/afed-metrics';

const dbStore = AfedDbStore.getInstance();
const metricsTracker = AfedMetricsTracker.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const nodes = dbStore.getAllNodes();
    return NextResponse.json({ success: true, nodes }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}, 'federated:read');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedNodeRegisterSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const nodeData = parse.data;
    dbStore.saveNode(nodeData);

    metricsTracker.setActiveNodes(nodeData.campusId, dbStore.getAllNodes().length);

    return NextResponse.json({ success: true, node: nodeData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register node' },
      { status: 500 }
    );
  }
}, 'federated:manage');
