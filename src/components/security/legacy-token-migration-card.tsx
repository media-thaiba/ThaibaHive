"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DeprecationStats {
  mode: "WARN" | "SOFT_ENFORCE" | "STRICT";
  sunsetDate: string;
  daysUntilSunset: number;
  totalSessions: number;
  dpopSessions: number;
  legacySessions: number;
  dpopAdoptionPercentage: number;
  clientDistribution: Array<{ clientVersion: string; legacyCount: number; dpopCount: number }>;
}

interface LegacyTokenMigrationCardProps {
  stats: DeprecationStats;
  onModeChange?: (newMode: "WARN" | "SOFT_ENFORCE" | "STRICT") => void;
}

export function LegacyTokenMigrationCard({ stats, onModeChange }: LegacyTokenMigrationCardProps) {
  const [updating, setUpdating] = useState(false);

  const getModeBadgeVariant = (mode: string) => {
    switch (mode) {
      case "STRICT":
        return "destructive";
      case "SOFT_ENFORCE":
        return "warning";
      default:
        return "info";
    }
  };

  const handleToggleMode = async (newMode: "WARN" | "SOFT_ENFORCE" | "STRICT") => {
    setUpdating(true);
    try {
      if (onModeChange) {
        onModeChange(newMode);
      }
    } finally {
      setUpdating(false);
    }
  };

  const pct = Math.min(100, Math.max(0, stats.dpopAdoptionPercentage || 0)).toFixed(1);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold">Legacy Token Sunset & DPoP Migration</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            RFC 8594 Sunset enforcement for transitioning all platform sessions to Zero-Trust DPoP attestation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Enforcement Mode:</span>
          <Badge variant={getModeBadgeVariant(stats.mode)}>{stats.mode}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/40 rounded-md">
            <span className="text-xs text-muted-foreground">DPoP Adoption</span>
            <p className="text-2xl font-bold text-success">{pct}%</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-md">
            <span className="text-xs text-muted-foreground">DPoP Verified Sessions</span>
            <p className="text-2xl font-bold">{stats.dpopSessions}</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-md">
            <span className="text-xs text-muted-foreground">Legacy Bearer Sessions</span>
            <p className="text-2xl font-bold text-destructive">{stats.legacySessions}</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-md">
            <span className="text-xs text-muted-foreground">Sunset Deadline</span>
            <p className="text-2xl font-bold text-warning">{stats.daysUntilSunset}d</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Adoption Progress</span>
            <span>{pct}% (Target: 100%)</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={Number(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Client Version Distribution Table */}
        {stats.clientDistribution && stats.clientDistribution.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Client Platform Adoption Breakdown</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Application / Integration</TableHead>
                    <TableHead className="text-right">DPoP Bound</TableHead>
                    <TableHead className="text-right">Legacy Bearer</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.clientDistribution.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs">{item.clientVersion}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.dpopCount}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{item.legacyCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.legacyCount === 0 ? "success" : "warning"}>
                          {item.legacyCount === 0 ? "Migrated" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mode Selector Controls */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t gap-2">
          <span className="text-xs text-muted-foreground">Update Sunset Enforcement Stage:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={stats.mode === "WARN" ? "default" : "outline"}
              disabled={updating || stats.mode === "WARN"}
              onClick={() => handleToggleMode("WARN")}
            >
              WARN
            </Button>
            <Button
              size="sm"
              variant={stats.mode === "SOFT_ENFORCE" ? "default" : "outline"}
              disabled={updating || stats.mode === "SOFT_ENFORCE"}
              onClick={() => handleToggleMode("SOFT_ENFORCE")}
            >
              SOFT ENFORCE
            </Button>
            <Button
              size="sm"
              variant={stats.mode === "STRICT" ? "destructive" : "outline"}
              disabled={updating || stats.mode === "STRICT"}
              onClick={() => handleToggleMode("STRICT")}
            >
              STRICT REJECT
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
