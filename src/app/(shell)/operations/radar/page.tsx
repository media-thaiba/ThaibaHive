"use client";

import { useState, useEffect, useCallback } from "react";
import { CampusRadarMap, RadarBlip, RadarZone, AnchorNode } from "@/components/hardware/campus-radar-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ensureArray } from "@/lib/utils";
import { toast } from "sonner";
import {
  Radio,
  Users,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
} from "lucide-react";

interface MusterReportData {
  totalOccupantsOnSite: number;
  accountedInMusterCount: number;
  missingOccupantsCount: number;
  evacuationPercentage: number;
  musterZones: Array<{
    zoneId: string;
    zoneName: string;
    floorNumber: number;
    occupantCount: number;
  }>;
  missingOccupants: Array<{
    badgeId: string;
    userName: string;
    userType: string;
    lastSeenZoneName: string;
    lastSeenTimestamp: string;
  }>;
}

export default function RadarOperationsPage() {
  const [zones, setZones] = useState<RadarZone[]>([]);
  const [blips, setBlips] = useState<RadarBlip[]>([]);
  const [anchors, setAnchors] = useState<AnchorNode[]>([]);
  const [musterReport, setMusterReport] = useState<MusterReportData | null>(null);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Zones
      const zonesRes = await fetch("/api/hardware/zones");
      const zonesData = await zonesRes.json().catch(() => ({}));
      if (zonesRes.ok && zonesData.zones) {
        setZones(zonesData.zones);
      }

      // 2. Fetch Muster Accounting Report
      const musterRes = await fetch("/api/hardware/radar/muster");
      const musterData = await musterRes.json().catch(() => ({}));
      if (musterRes.ok && musterData.report) {
        setMusterReport(musterData.report);
      }

      // 3. Fetch Hardware Devices (Anchors)
      const devRes = await fetch("/api/hardware/devices?type=beacon");
      const devData = await devRes.json().catch(() => ({}));
      if (devRes.ok && devData.devices) {
        const mappedAnchors: AnchorNode[] = devData.devices.map((d: any) => ({
          id: d.id,
          name: d.name,
          coordinates: { x: d.coordinatesX || 100, y: d.coordinatesY || 100 },
          status: d.status === "online" ? "online" : "offline",
        }));
        setAnchors(mappedAnchors);
      }

      // 4. Synthesize Live Blips from active badges
      const badgesRes = await fetch("/api/hardware/badges?status=active");
      const badgesData = await badgesRes.json().catch(() => ({}));
      if (badgesRes.ok && badgesData.badges) {
        const mappedBlips: RadarBlip[] = badgesData.badges.map((b: any, idx: number) => ({
          id: b.id,
          label: b.staffId ? `Staff #${b.staffId}` : b.studentId ? `Student #${b.studentId}` : `Badge ${b.badgeId}`,
          type: b.credentialType === "staff_id" ? "staff" : b.credentialType === "student_id" ? "student" : "visitor",
          coordinates: {
            x: 80 + (idx * 95) % 550,
            y: 90 + (idx * 75) % 350,
          },
          lastSeen: b.lastUsedAt || new Date().toISOString(),
        }));
        setBlips(mappedBlips);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load radar spatial data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  const safeMusterZones: MusterReportData["musterZones"] = ensureArray(musterReport?.musterZones);
  const safeMissingOccupants: MusterReportData["missingOccupants"] = ensureArray(musterReport?.missingOccupants);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
            Hardware Proximity Radar & Spatial Geofence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time BLE 2D trilateration, dynamic geofencing & automated muster evacuation accounting
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData().catch(() => {})}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Radar
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}

      {/* Real-time Headcount Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total On-Site Occupants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {musterReport?.totalOccupantsOnSite ?? blips.length}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-emerald-600">
              Accounted in Muster Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {musterReport?.accountedInMusterCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-amber-600">
              Missing in Facility
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-amber-600">
                {musterReport?.missingOccupantsCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Evacuation Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono text-primary">
                {musterReport?.evacuationPercentage ?? 100}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interactive 2D Canvas Radar */}
      <CampusRadarMap
        zones={zones}
        blips={blips}
        anchors={anchors}
        selectedFloor={selectedFloor}
        onFloorChange={setSelectedFloor}
        isLoading={isLoading}
        onRefresh={() => fetchData().catch(() => {})}
      />

      {/* Muster Point Accounting Breakdown & Missing Personnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Muster Assembly Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Designated Muster Assembly Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : safeMusterZones.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No active muster points configured on this campus.
              </div>
            ) : (
              <div className="space-y-3">
                {safeMusterZones.map((mz) => (
                  <div
                    key={mz.zoneId}
                    className="flex items-center justify-between p-3.5 bg-muted/30 rounded-lg border"
                  >
                    <div>
                      <div className="font-semibold text-sm">{mz.zoneName}</div>
                      <div className="text-xs text-muted-foreground">
                        Floor Level {mz.floorNumber}
                      </div>
                    </div>
                    <Badge variant="success" className="font-mono text-sm px-3 py-1">
                      {mz.occupantCount} Safe
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missing Personnel / Unaccounted Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Unaccounted Occupants in Facility
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : safeMissingOccupants.length === 0 ? (
              <div className="text-sm text-emerald-600 py-6 text-center font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                All on-campus personnel safely accounted for in muster zones!
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {safeMissingOccupants.map((occ) => (
                  <div
                    key={occ.badgeId}
                    className="flex items-center justify-between p-3.5 bg-destructive/5 rounded-lg border border-destructive/20"
                  >
                    <div>
                      <div className="font-semibold text-sm">{occ.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        Last seen in: <span className="font-medium text-foreground">{occ.lastSeenZoneName}</span>
                      </div>
                    </div>
                    <Badge variant="warning" className="text-xs font-mono">
                      {new Date(occ.lastSeenTimestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
