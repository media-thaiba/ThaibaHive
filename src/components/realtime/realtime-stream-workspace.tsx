"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface ClusterMetricsUI {
  activeNodes: number;
  totalSlots: number;
  slotHashAlgorithm: string;
  isClusterMode: boolean;
  memoryUsageMb: number;
  hitRatePercentage: number;
  nodeStatuses: Array<{
    nodeId: string;
    region: string;
    role: string;
    status: string;
    slotsHandled: string;
  }>;
}

interface RealTimeStreamWorkspaceProps {
  activeConnectionsCount: number;
  metrics: ClusterMetricsUI;
}

export function RealTimeStreamWorkspace({ activeConnectionsCount, metrics }: RealTimeStreamWorkspaceProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Streaming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary font-mono">{activeConnectionsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">WebSocket & SSE channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Redis Cluster Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{metrics.activeNodes} Active</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.totalSlots} slots ({metrics.slotHashAlgorithm})</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cache Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{metrics.memoryUsageMb} MB</div>
            <p className="text-xs text-muted-foreground mt-1">Key Hashtag Sharding Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Redis Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{metrics.hitRatePercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-Region Replication</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Multi-Region Redis Cluster Node Topography</CardTitle>
          <p className="text-sm text-muted-foreground">
            Geographically distributed cluster nodes with tenant hashtag key slot alignment (`thaiba:&#123;tenant_id&#125;:...`).
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node ID</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Cluster Role</TableHead>
                <TableHead>Slot Allocation</TableHead>
                <TableHead className="text-right">Health Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.nodeStatuses.map((n) => (
                <TableRow key={n.nodeId}>
                  <TableCell className="font-medium font-mono">{n.nodeId}</TableCell>
                  <TableCell className="capitalize">{n.region}</TableCell>
                  <TableCell className="uppercase text-xs font-bold">{n.role}</TableCell>
                  <TableCell className="font-mono text-xs">{n.slotsHandled}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={n.status === "ONLINE" ? "success" : "destructive"}>
                      {n.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
