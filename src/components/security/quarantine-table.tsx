/**
 * Active IP Quarantines Table Component
 * Sprint-038 / AGS-013
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuarantineRecord } from "@/lib/security/quarantine-store";

interface QuarantineTableProps {
  quarantines: QuarantineRecord[];
  onUnban: (id: string) => Promise<boolean>;
}

export function QuarantineTable({ quarantines, onUnban }: QuarantineTableProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const filteredQuarantines = useMemo(() => {
    if (!filterQuery.trim()) return quarantines;
    const query = filterQuery.toLowerCase();
    return quarantines.filter(
      (q) =>
        q.ipAddress.toLowerCase().includes(query) ||
        q.reason.toLowerCase().includes(query) ||
        q.bannedBy.toLowerCase().includes(query)
    );
  }, [quarantines, filterQuery]);

  if (quarantines.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground border rounded-md">
        No active IP quarantines in effect. All edge traffic is flowing normally.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filter by IP, subnet, or reason..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="text-xs text-muted-foreground">
          Showing {filteredQuarantines.length} of {quarantines.length} active quarantines
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target IP / Subnet</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Threat Score</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Banned By</TableHead>
              <TableHead>Expires In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuarantines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No quarantines match &quot;{filterQuery}&quot;
                </TableCell>
              </TableRow>
            ) : (
              filteredQuarantines.map((q) => {
                const now = currentTime || q.createdAt;
                const minutesLeft = Math.max(0, Math.ceil((q.expiresAt - now) / 60_000));
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-medium">{q.ipAddress}</TableCell>
                    <TableCell>
                      <Badge variant={q.cidrMask === "/24" ? "warning" : "secondary"}>
                        {q.cidrMask === "/24" ? "/24 Subnet" : "Single IP"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.threatScore >= 90 ? "destructive" : "warning"}>
                        {q.threatScore} / 100
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={q.reason}>
                      {q.reason}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.bannedBy}</TableCell>
                    <TableCell className="text-muted-foreground">{minutesLeft} mins</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUnban(q.id)}
                      >
                        Unban
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
