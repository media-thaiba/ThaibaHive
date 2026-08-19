"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CircuitBreakerControlTableProps {
  feature: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  onTrip?: () => void;
  onReset?: () => void;
}

export function CircuitBreakerControlTable({
  feature,
  state,
  failureCount,
  onTrip,
  onReset,
}: CircuitBreakerControlTableProps) {
  const isClosed = state === "CLOSED";

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-4 text-base font-semibold text-white">Distributed Circuit Breakers Control Matrix</h3>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-slate-900">
            <TableHead className="text-slate-300">Feature Key</TableHead>
            <TableHead className="text-slate-300">Circuit State</TableHead>
            <TableHead className="text-slate-300">Failure Counter</TableHead>
            <TableHead className="text-slate-300">Administrative Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="border-slate-800 hover:bg-slate-800/50">
            <TableCell className="font-medium text-slate-200">{feature}</TableCell>
            <TableCell>
              <Badge variant={isClosed ? "success" : "destructive"}>{state}</Badge>
            </TableCell>
            <TableCell className="text-slate-200">{failureCount} / 5</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-rose-400 border-rose-500 hover:bg-rose-950" onClick={onTrip}>
                  Force Trip (OPEN)
                </Button>
                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500 hover:bg-emerald-950" onClick={onReset}>
                  Reset (CLOSED)
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
