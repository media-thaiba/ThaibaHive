/**
 * Live Threat Intelligence Graph Viewer Component
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThreatGraphNode, ThreatGraphEdge } from '@/lib/security/graph/graph-types';

interface ThreatIntelligenceGraphViewerProps {
  nodes: ThreatGraphNode[];
  edges: ThreatGraphEdge[];
  overview?: { totalNodes: number; totalEdges: number; nodeTypeCounts: Record<string, number> };
  loading?: boolean;
}

export function ThreatIntelligenceGraphViewer({
  nodes,
  edges,
  overview,
  loading,
}: ThreatIntelligenceGraphViewerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Live Threat Intelligence Graph</h2>
          <p className="text-sm text-muted-foreground">
            Interconnected topology mapping threat actors, CVEs, attack paths, and critical choke points
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">{overview?.totalNodes || nodes.length} Nodes</Badge>
          <Badge variant="secondary">{overview?.totalEdges || edges.length} Relationships</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Graph Topology Matrix</CardTitle>
          <CardDescription className="text-xs">
            Real-time graph entities synced from STIX/TAXII threat feeds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {nodes.map((node) => (
              <div key={node.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={node.type === 'ThreatActor' ? 'destructive' : node.type === 'Vulnerability_CVE' ? 'warning' : 'default'}>
                    {node.type}
                  </Badge>
                  <span className="font-mono text-muted-foreground">Risk: {node.riskScore}</span>
                </div>
                <div className="font-semibold truncate">{node.name}</div>
                <div className="text-muted-foreground text-[10px] truncate">{node.id}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
