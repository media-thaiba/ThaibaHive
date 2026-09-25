'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ClusterOverviewCard } from '@/components/operations/neuro/cluster-overview-card';
import { NodeTopologyGrid } from '@/components/operations/neuro/node-topology-grid';
import { Datacenter3DTopology } from '@/components/operations/neuro/datacenter-3d-topology';
import { NeuroClusterItem, NeuroGpuItem, NeuroNodeItem } from '@/lib/operations/neuro/neuro-types';
import { ensureArray } from '@/lib/utils';

export default function ResearchComputePage() {
  const [clusters, setClusters] = useState<NeuroClusterItem[]>([]);
  const [nodes, setNodes] = useState<NeuroNodeItem[]>([]);
  const [gpus, setGpus] = useState<NeuroGpuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/neuro/clusters').then((res) => res.json()),
      fetch('/api/neuro/nodes').then((res) => res.json()),
      fetch('/api/neuro/gpus').then((res) => res.json()),
    ])
      .then(([clustersData, nodesData, gpusData]) => {
        setClusters(ensureArray(clustersData.clusters));
        setNodes(ensureArray(nodesData.nodes));
        setGpus(ensureArray(gpusData.gpus));
      })
      .catch((err) => {
        setError(err.message || 'Failed to load research compute cluster data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const gpusByNode = gpus.reduce<Record<string, NeuroGpuItem[]>>((acc, gpu) => {
    if (!acc[gpu.nodeId]) acc[gpu.nodeId] = [];
    acc[gpu.nodeId].push(gpu);
    return acc;
  }, {});

  const allocatedGpusCount = gpus.filter((g) => g.status === 'allocated').length;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <PageHeader
        title="NEURO-CLUSTER / ResearchCompute OS"
        description="Autonomous AI & Supercomputing Cluster Orchestrator with Fair-Share GPU Scheduling"
        actions={
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            Refresh Cluster
          </Button>
        }
      />

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {clusters.map((cluster) => (
            <ClusterOverviewCard
              key={cluster.id}
              cluster={cluster}
              allocatedGpus={allocatedGpusCount}
              activeJobs={cluster.activeJobsCount || 0}
            />
          ))}

          <Datacenter3DTopology nodes={nodes} gpus={gpus} />

          <div>
            <h2 className="text-base font-semibold mb-3 text-foreground">Physical Compute Nodes & GPU Fabrics</h2>
            <NodeTopologyGrid nodes={nodes} gpusByNode={gpusByNode} />
          </div>
        </div>
      )}
    </div>
  );
}
