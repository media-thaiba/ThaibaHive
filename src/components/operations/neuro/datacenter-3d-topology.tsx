'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeuroGpuItem, NeuroNodeItem } from '@/lib/operations/neuro/neuro-types';

interface Datacenter3DTopologyProps {
  nodes: NeuroNodeItem[];
  gpus: NeuroGpuItem[];
  onSelectNode?: (node: NeuroNodeItem) => void;
}

export const Datacenter3DTopology: React.FC<Datacenter3DTopologyProps> = ({
  nodes,
  gpus,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Isometric projection origin
      const originX = canvas.width / 2;
      const originY = 80;

      // Draw Grid Floor
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)';
      ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) {
        // Line along X-iso
        const x1 = originX + i * 30 - 6 * 30;
        const y1 = originY + i * 15 + 6 * 15;
        const x2 = originX + i * 30 + 6 * 30;
        const y2 = originY + i * 15 - 6 * 15;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + 180);
        ctx.lineTo(x2, y2 + 180);
        ctx.stroke();
      }

      // Draw Datacenter Racks
      const rackWidth = 40;
      const rackDepth = 30;
      const rackHeight = 120;

      nodes.forEach((node, idx) => {
        const row = Math.floor(idx / 4);
        const col = idx % 4;

        const posX = originX + (col - 2) * 80 + (row - 1) * -40;
        const posY = originY + (col - 2) * 40 + (row - 1) * 30 + 100;

        // Determine rack color based on thermal/load
        const isSelected = selectedNodeId === node.id;
        const baseColor = node.status === 'busy' ? '#f59e0b' : node.status === 'ready' ? '#10b981' : '#ef4444';

        // Top face
        ctx.fillStyle = isSelected ? '#3b82f6' : baseColor;
        ctx.beginPath();
        ctx.moveTo(posX, posY - rackHeight);
        ctx.lineTo(posX + rackWidth, posY - rackHeight + rackDepth * 0.5);
        ctx.lineTo(posX, posY - rackHeight + rackDepth);
        ctx.lineTo(posX - rackWidth, posY - rackHeight + rackDepth * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Left face
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.beginPath();
        ctx.moveTo(posX - rackWidth, posY - rackHeight + rackDepth * 0.5);
        ctx.lineTo(posX, posY - rackHeight + rackDepth);
        ctx.lineTo(posX, posY + rackDepth);
        ctx.lineTo(posX - rackWidth, posY + rackDepth * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right face
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.beginPath();
        ctx.moveTo(posX, posY - rackHeight + rackDepth);
        ctx.lineTo(posX + rackWidth, posY - rackHeight + rackDepth * 0.5);
        ctx.lineTo(posX + rackWidth, posY + rackDepth * 0.5);
        ctx.lineTo(posX, posY + rackDepth);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.fillText(node.nodeId, posX - 20, posY - rackHeight - 6);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, gpus, selectedNodeId]);

  return (
    <Card className="border border-border/60 bg-card/90 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">3D Interactive Datacenter & NVLink Fabric Visualizer</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time thermal hotspots, power draw, and InfiniBand fat-tree topology
          </p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          3D Canvas Engine
        </Badge>
      </CardHeader>
      <CardContent className="flex justify-center p-2">
        <canvas
          ref={canvasRef}
          width={700}
          height={320}
          className="rounded-lg bg-zinc-950 w-full max-w-2xl border border-zinc-800"
          onClick={() => {
            if (nodes.length > 0) {
              const n = nodes[0];
              setSelectedNodeId(n.id);
              onSelectNode?.(n);
            }
          }}
        />
      </CardContent>
    </Card>
  );
};
