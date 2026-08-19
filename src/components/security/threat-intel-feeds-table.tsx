"use client";

import { ThreatFeedConfig } from "@/lib/security/threat-intel/threat-feed-config";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ThreatIntelFeedsTableProps {
  feeds: ThreatFeedConfig[];
}

export function ThreatIntelFeedsTable({ feeds }: ThreatIntelFeedsTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "syncing":
        return "info";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feed Name</TableHead>
            <TableHead>Source URL</TableHead>
            <TableHead>Auth</TableHead>
            <TableHead>Quarantine Threshold</TableHead>
            <TableHead>Indicators</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No threat feeds configured. Add a TAXII 2.1 feed to begin automated ingestion.
              </TableCell>
            </TableRow>
          ) : (
            feeds.map((feed) => (
              <TableRow key={feed.id}>
                <TableCell className="font-medium">{feed.name}</TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate text-muted-foreground">
                  {feed.url}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{feed.authType}</Badge>
                </TableCell>
                <TableCell className="text-sm">{feed.autoQuarantineConfidenceThreshold}%</TableCell>
                <TableCell className="font-semibold">{feed.indicatorCount}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(feed.status)}>{feed.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {feed.lastSyncAt ? new Date(feed.lastSyncAt).toLocaleTimeString() : "Never"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
