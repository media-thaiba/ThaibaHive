'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useFederatedNodes } from '@/lib/hooks/use-federated-nodes';

export function SmpcMeshPanel() {
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SMPC Cryptographic Mesh & Node Topology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {nodes.map((node) => (
              <div key={node.nodeId} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{node.campusName}</span>
                  <Badge variant={node.status === 'training' ? 'warning' : 'success'}>
                    {node.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Node ID: {node.nodeId} | Samples: {node.sampleCount} | Latency: {node.networkLatencyMs}ms
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
