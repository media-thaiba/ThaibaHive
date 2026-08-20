'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useFederatedNodes } from '@/lib/hooks/use-federated-nodes';

export function NodeMeshTab() {
  const { nodes, isLoading, error } = useFederatedNodes();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Decentralized Campus Edge Mesh</h3>
        <p className="text-sm text-muted-foreground">
          Participating campus worker nodes executing local gradient computation and Push-Sum gossip.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nodes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No active edge nodes registered in the mesh.
            </CardContent>
          </Card>
        ) : (
          nodes.map((node) => (
            <Card key={node.nodeId} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{node.campusName}</CardTitle>
                <Badge variant={node.status === 'idle' || node.status === 'training' ? 'success' : 'secondary'}>
                  {node.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node ID:</span>
                  <span className="font-mono text-xs">{node.nodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier:</span>
                  <span className="capitalize">{node.computeTier.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Local Samples:</span>
                  <span className="font-semibold">{node.sampleCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency:</span>
                  <span>{node.networkLatencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reputation:</span>
                  <span className="font-mono text-xs">{(node.reputationScore * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
