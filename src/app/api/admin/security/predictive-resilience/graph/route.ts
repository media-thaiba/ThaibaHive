/**
 * Admin Threat Intelligence Graph Query Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { Neo4jThreatGraphAdapter } from '@/lib/security/graph/neo4j-adapter';
import { ThreatGraphQueryEngine } from '@/lib/security/graph/graph-query-engine';

export const GET = withDPoP(
  requireAuth(async () => {
    const adapter = Neo4jThreatGraphAdapter.getInstance();
    const queryEngine = ThreatGraphQueryEngine.getInstance();

    const nodes = adapter.listNodes();
    const edges = adapter.listEdges();
    const overview = queryEngine.getGraphOverview();

    return NextResponse.json({
      overview,
      nodes,
      edges,
    });
  }, 'system:security:view'),
  { required: false }
);
