'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NeuroJobItem } from '@/lib/operations/neuro/neuro-types';

interface LiveTerminalDrawerProps {
  job: NeuroJobItem | null;
  onClose: () => void;
}

export const LiveTerminalDrawer: React.FC<LiveTerminalDrawerProps> = ({ job, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;

    // Simulated initial log buffer
    setLogs([
      `[NEURO-CLUSTER] Initializing container runtime: ${job.containerImage}`,
      `[NEURO-CLUSTER] Allocated GPUs: ${job.allocatedGpuIdsJson || 'Gang Scheduled [GPU-0, GPU-1, GPU-2, GPU-3]'}`,
      `[NEURO-CLUSTER] Executing entrypoint: ${job.entrypointCommand}`,
      `[TORCH-DDP] Initialized process group with NCCL backend. World size = ${job.requestedGpus}`,
      `[STEP 100] Loss: 2.891 | Epoch: 0.1 | VRAM: 38.4GB | Throughput: 14,200 tokens/sec`,
      `[STEP 200] Loss: 2.450 | Epoch: 0.2 | VRAM: 38.4GB | Throughput: 14,350 tokens/sec`,
      `[STEP 300] Loss: 2.110 | Epoch: 0.3 | VRAM: 38.4GB | Throughput: 14,400 tokens/sec`,
    ]);

    const interval = setInterval(() => {
      const step = Math.floor(Math.random() * 500) + 400;
      const loss = (1.5 - Math.random() * 0.4).toFixed(4);
      setLogs((prev) => [
        ...prev,
        `[STEP ${step}] Loss: ${loss} | VRAM: 38.4GB | SM Clock: 1980MHz | Temp: 42°C`,
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, [job]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!job) return null;

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-2/3 lg:w-1/2 h-96 z-50 p-4 transition-transform ease-in-out">
      <Card className="h-full border-2 border-primary/40 bg-zinc-950/95 text-zinc-100 shadow-2xl flex flex-col font-mono">
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY STREAM — {job.jobName} ({job.jobId})
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] uppercase font-mono">
              {job.status}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs border-zinc-700 hover:bg-zinc-800">
            Close
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-3 overflow-y-auto space-y-1 text-xs text-zinc-300 font-mono" ref={scrollRef}>
          {logs.map((line, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-zinc-600 mr-2">{String(idx + 1).padStart(3, '0')}</span>
              {line}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
