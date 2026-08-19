"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ThreatIndicatorsChartProps {
  totalFeeds: number;
  activeFeeds: number;
  totalIndicators: number;
}

export function ThreatIndicatorsChart({ totalFeeds, activeFeeds, totalIndicators }: ThreatIndicatorsChartProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{activeFeeds}</span>
            <Badge variant="success">Online</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{totalFeeds} configured collections</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Imported Threat Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-destructive">{totalIndicators}</span>
            <Badge variant="destructive">STIX 2.1</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Evaluated across all active feeds</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Mesh Federation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-info">Active</span>
            <Badge variant="info">PubSub Mesh</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Inter-campus threat exchange enabled</p>
        </CardContent>
      </Card>
    </div>
  );
}
