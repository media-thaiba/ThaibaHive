'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeuroClusterItem } from '@/lib/operations/neuro/neuro-types';

interface ClusterOverviewCardProps {
  cluster: NeuroClusterItem;
  allocatedGpus: number;
  activeJobs: number;
  onRefresh?: () => void;
}

export const ClusterOverviewCard: React.FC<ClusterOverviewCardProps> = ({
  cluster,
  allocatedGpus,
  activeJobs,
}) => {
  const utilization = cluster.totalGpus > 0 ? (allocatedGpus / cluster.totalGpus) * 100 : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'maintenance':
        return <Badge variant="warning">Maintenance</Badge>;
      case 'degraded':
        return <Badge variant="destructive">Degraded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="border border-border/60 bg-card/95 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            {cluster.name}
            {getStatusBadge(cluster.status)}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {cluster.clusterId} • Region: {cluster.region} • Topology: {cluster.networkTopology}
          </p>
        </div>
        <Badge variant="info" className="uppercase font-mono text-xs">
          {cluster.schedulerType}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
          <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground font-medium">Total Nodes</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{cluster.totalNodes}</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground font-medium">Total GPUs</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{cluster.totalGpus}</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground font-medium">GPU Utilization</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{utilization.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground font-medium">Active Jobs</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{activeJobs}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
