'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKmGraph } from '@/lib/hooks/km/use-km-graph';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, ArrowRight } from 'lucide-react';

export function GraphExplorerPanel() {
  const [nodeInput, setNodeInput] = useState('CS-101');
  const { loading, startNode, paths, error, fetchGraphPaths } = useKmGraph();

  const handleSearch = () => {
    if (nodeInput.trim()) {
      fetchGraphPaths(nodeInput.trim());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Network className="h-5 w-5 text-indigo-600" />
            <CardTitle>Campus Knowledge Graph Explorer</CardTitle>
          </div>
          <Badge variant="info">Multi-Hop Traversal</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={nodeInput}
            onChange={(e) => setNodeInput(e.target.value)}
            placeholder="Enter Course/Policy Code (e.g. CS-101, POL-GRAD-2026)"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Traversing...' : 'Traverse Graph'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {startNode && !loading && (
          <div className="p-4 bg-slate-50 border rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">{startNode.name}</span>
              <Badge variant="secondary">{startNode.type}</Badge>
            </div>
            <div className="text-sm text-slate-600">
              Found <span className="font-medium text-indigo-600">{paths.length}</span> connected downstream paths.
            </div>

            <div className="space-y-2 mt-3">
              {paths.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs bg-white p-2 border rounded shadow-sm">
                  {p.nodes.map((n, nIdx) => (
                    <React.Fragment key={n.id}>
                      <span className="font-medium px-2 py-1 bg-slate-100 rounded text-slate-700">{n.id}</span>
                      {nIdx < p.nodes.length - 1 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
