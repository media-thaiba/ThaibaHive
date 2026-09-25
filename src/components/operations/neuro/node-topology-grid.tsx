'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeuroGpuItem, NeuroNodeItem } from '@/lib/operations/neuro/neuro-types';

interface NodeTopologyGridProps {
  nodes: NeuroNodeItem[];
  gpusByNode: Record<string, NeuroGpuItem[]>;
  onSelectGpu?: (gpu: NeuroGpuItem) => void;
}

export const NodeTopologyGrid: React.FC<NodeTopologyGridProps> = ({
  nodes,
  gpusByNode,
  onSelectGpu,
}) => {
  const getNodeStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'busy':
        return <Badge variant="info">Busy</Badge>;
      case 'draining':
        return <Badge variant="warning">Draining</Badge>;
      case 'cordoned':
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGpuColor = (status: string) => {
    switch (status) {
      case 'allocated':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400';
      case 'idle':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400';
      case 'error':
      case 'offline':
        return 'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {nodes.map((node) => {
        const nodeGpus = gpusByNode[node.id] || [];
        return (
          <Card key={node.id} className="border border-border/60 bg-card/90 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span>{node.hostname}</span>
                  {node.isCloudBurst && <Badge variant="secondary" className="text-[10px]">Cloud Burst ({node.cloudProvider.toUpperCase()})</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IP: {node.ipAddress} • Rack: {node.rackLocation || 'Unassigned'} • Slot: {node.chassisSlot || 1}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getNodeStatusBadge(node.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-2 border-b border-border/40">
                <span>Power: <strong className="text-foreground">{node.currentPowerWatts}W</strong></span>
                <span>Temp: <strong className="text-foreground">{node.temperatureCelsius}°C</strong></span>
                <span>Model: <strong className="text-foreground">{node.gpuModel}</strong></span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {nodeGpus.map((gpu) => (
                  <button
                    key={gpu.id}
                    onClick={() => onSelectGpu?.(gpu)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all hover:scale-105 cursor-pointer ${getGpuColor(gpu.status)}`}
                    title={`GPU ${gpu.gpuIndex}: ${gpu.status.toUpperCase()}\nVRAM: ${(gpu.vramAllocatedBytes / (1024 ** 3)).toFixed(1)} / ${(gpu.vramTotalBytes / (1024 ** 3)).toFixed(1)} GB\nTemp: ${gpu.temperatureCelsius}°C`}
                  >
                    <span className="text-[10px] font-bold">GPU {gpu.gpuIndex}</span>
                    <span className="text-[9px] uppercase tracking-wider">{gpu.status}</span>
                    {gpu.nvlinkActive && (
                      <span className="text-[8px] mt-0.5 bg-primary/20 text-primary px-1 rounded font-mono">NVLink</span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
