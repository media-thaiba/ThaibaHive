/**
 * Admin Attack Path Traversal API Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ThreatGraphQueryEngine } from '@/lib/security/graph/graph-query-engine';
import { attackPathQuerySchema } from '@/lib/validation/ares-schemas';

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = attackPathQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sourceId, targetId } = parsed.data;
    const queryEngine = ThreatGraphQueryEngine.getInstance();
    const pathResult = queryEngine.findAttackPaths(sourceId, targetId);

    if (!pathResult) {
      return NextResponse.json({ error: 'No reachable attack path found between nodes' }, { status: 404 });
    }

    return NextResponse.json({ pathResult });
  }, 'system:security:view'),
  { required: false }
);
