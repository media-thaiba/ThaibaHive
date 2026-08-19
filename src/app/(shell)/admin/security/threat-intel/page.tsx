"use client";

import { useThreatIntel } from "@/lib/hooks/use-threat-intel";
import { ThreatIndicatorsChart } from "@/components/security/threat-indicators-chart";
import { ThreatIntelFeedsTable } from "@/components/security/threat-intel-feeds-table";
import { AddThreatFeedDialog } from "@/components/security/add-threat-feed-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export default function ThreatIntelAdminPage() {
  const {
    feeds,
    totalFeeds,
    activeFeeds,
    totalIndicatorsImported,
    loading,
    error,
    syncNow,
    addFeed,
  } = useThreatIntel();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Threat Intelligence Federation</h1>
            <Skeleton className="h-4 w-72 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Threat Intelligence Federation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated STIX 2.1 / TAXII 2.1 feed ingestion and inter-institutional collaborative threat sharing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncNow}>
            ↻ Sync All Feeds
          </Button>
          <AddThreatFeedDialog onAddFeed={addFeed} />
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <p className="font-semibold">Error Loading Threat Feeds</p>
          <p className="text-xs mt-1">{error}</p>
        </Alert>
      )}

      {/* Metrics Summary */}
      <ThreatIndicatorsChart
        totalFeeds={totalFeeds}
        activeFeeds={activeFeeds}
        totalIndicators={totalIndicatorsImported}
      />

      {/* Feeds Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Active Threat Intelligence Feeds</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configured TAXII collections polled on scheduled intervals with automatic IP quarantine enforcement
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ThreatIntelFeedsTable feeds={feeds} />
        </CardContent>
      </Card>
    </div>
  );
}
