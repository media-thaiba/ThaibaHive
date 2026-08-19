"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface TopologyNode {
  id: string;
  nodeId: string;
  tier: "local" | "regional" | "global";
  status: string;
  lastSeenAt: string;
}

interface SwarmTopologyProps {
  nodes: TopologyNode[];
}

export const SwarmTopology: React.FC<SwarmTopologyProps> = ({ nodes }) => {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  const globalNodes = nodes.filter((n) => n.tier === "global");
  const regionalNodes = nodes.filter((n) => n.tier === "regional");
  const localNodes = nodes.filter((n) => n.tier === "local");

  const hasNodes = nodes.length > 0;
  const displayGlobal = hasNodes ? globalNodes : [{ id: "g1", nodeId: "Global Coordinator A", tier: "global" as const, status: "active", lastSeenAt: new Date().toISOString() }];
  const displayRegional = hasNodes ? regionalNodes : [
    { id: "r1", nodeId: "Regional Mediator North", tier: "regional" as const, status: "active", lastSeenAt: new Date().toISOString() },
    { id: "r2", nodeId: "Regional Mediator South", tier: "regional" as const, status: "partitioned", lastSeenAt: new Date().toISOString() },
  ];
  const displayLocal = hasNodes ? localNodes : [
    { id: "l1", nodeId: "Local Agent 01", tier: "local" as const, status: "active", lastSeenAt: new Date().toISOString() },
    { id: "l2", nodeId: "Local Agent 02", tier: "local" as const, status: "active", lastSeenAt: new Date().toISOString() },
    { id: "l3", nodeId: "Local Agent 03", tier: "local" as const, status: "offline", lastSeenAt: new Date().toISOString() },
    { id: "l4", nodeId: "Local Agent 04", tier: "local" as const, status: "active", lastSeenAt: new Date().toISOString() },
  ];

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "partitioned":
        return "warning";
      case "offline":
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="col-span-3 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Swarm Node Topology
          <Badge variant="info">{nodes.length || 7} Nodes Registered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] flex items-center justify-center relative overflow-hidden">
        <svg className="w-full h-full min-h-[350px]" viewBox="0 0 800 400">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cccccc" />
            </marker>
            <marker id="arrow-partitioned" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Connection Lines from Global to Regional */}
          {displayRegional.map((reg, idx) => {
            const regX = displayRegional.length === 1 ? 400 : 200 + idx * 400;
            const isPartitioned = reg.status === "partitioned";
            return (
              <line
                key={`line-g-r-${idx}`}
                x1={400}
                y1={50}
                x2={regX}
                y2={180}
                stroke={isPartitioned ? "#f59e0b" : "#e2e8f0"}
                strokeWidth={2}
                strokeDasharray={isPartitioned ? "5,5" : undefined}
                className={isPartitioned ? "animate-pulse" : ""}
                markerEnd={isPartitioned ? "url(#arrow-partitioned)" : "url(#arrow)"}
              />
            );
          })}

          {/* Connection Lines from Regional to Local */}
          {displayLocal.map((loc, idx) => {
            const locX = 100 + idx * 200;
            const regIdx = idx < displayLocal.length / 2 ? 0 : 1;
            const regX = displayRegional.length === 1 ? 400 : 200 + regIdx * 400;
            const isPartitioned = loc.status === "partitioned" || (displayRegional[regIdx]?.status === "partitioned");
            return (
              <line
                key={`line-r-l-${idx}`}
                x1={regX}
                y1={180}
                x2={locX}
                y2={310}
                stroke={isPartitioned ? "#f59e0b" : "#e2e8f0"}
                strokeWidth={2}
                strokeDasharray={isPartitioned ? "5,5" : undefined}
                markerEnd={isPartitioned ? "url(#arrow-partitioned)" : "url(#arrow)"}
              />
            );
          })}

          {/* Global Coordinator Nodes */}
          {displayGlobal.map((glob) => (
            <g key={glob.id} transform="translate(350, 20)" className="cursor-pointer" onClick={() => setSelectedNode(glob)}>
              <rect x="0" y="0" width="100" height="40" rx="6" fill="#1e1b4b" stroke="#4338ca" strokeWidth="2" />
              <text x="50" y="25" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">Global Coordinator</text>
              <circle cx="95" cy="5" r="5" fill={glob.status === "active" ? "#22c55e" : "#ef4444"} />
            </g>
          ))}

          {/* Regional Coordinator Nodes */}
          {displayRegional.map((reg, idx) => {
            const regX = displayRegional.length === 1 ? 400 : 200 + idx * 400;
            return (
              <g key={reg.id} transform={`translate(${regX - 60}, 160)`} className="cursor-pointer" onClick={() => setSelectedNode(reg)}>
                <rect x="0" y="0" width="120" height="40" rx="6" fill="#0f172a" stroke={reg.status === "partitioned" ? "#f59e0b" : "#475569"} strokeWidth="2" />
                <text x="60" y="25" fill="#f8fafc" fontSize="10" textAnchor="middle">{reg.nodeId}</text>
                <circle cx="115" cy="5" r="5" fill={reg.status === "active" ? "#22c55e" : reg.status === "partitioned" ? "#f59e0b" : "#ef4444"} />
              </g>
            );
          })}

          {/* Local Agent Nodes */}
          {displayLocal.map((loc, idx) => {
            const locX = 100 + idx * 200;
            return (
              <g key={loc.id} transform={`translate(${locX - 50}, 290)`} className="cursor-pointer" onClick={() => setSelectedNode(loc)}>
                <rect x="0" y="0" width="100" height="40" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <text x="50" y="25" fill="#94a3b8" fontSize="9" textAnchor="middle">{loc.nodeId}</text>
                <circle cx="95" cy="5" r="5" fill={loc.status === "active" ? "#22c55e" : "#ef4444"} />
              </g>
            );
          })}
        </svg>
      </CardContent>

      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        {selectedNode && (
          <DialogContent className="sm:max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Node Details: {selectedNode.nodeId}
                <Badge variant={getStatusVariant(selectedNode.status)}>{selectedNode.status.toUpperCase()}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm text-foreground">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Node ID:</span>
                <span className="col-span-2 font-mono">{selectedNode.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Swarm Tier:</span>
                <span className="col-span-2 capitalize">{selectedNode.tier}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Last Heartbeat:</span>
                <span className="col-span-2">{new Date(selectedNode.lastSeenAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Health Score:</span>
                <span className="col-span-2 font-bold text-success">98%</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
};
