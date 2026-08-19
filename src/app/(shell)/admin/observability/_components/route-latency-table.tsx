"use client";

import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown } from "lucide-react";
import type { RouteMetricSummary } from "@/lib/observability/sliding-window-aggregator";

interface RouteLatencyTableProps {
  routes: RouteMetricSummary[];
  isLoading: boolean;
}

type SortField = "route" | "totalRequests" | "errorRate" | "p50" | "p90" | "p95" | "p99";

export function RouteLatencyTable({ routes, isLoading }: RouteLatencyTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("p95");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredRoutes = useMemo(() => {
    let list = [...(routes || [])];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) => r.route.toLowerCase().includes(term) || r.method.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case "route":
          valA = a.route;
          valB = b.route;
          break;
        case "totalRequests":
          valA = a.totalRequests;
          valB = b.totalRequests;
          break;
        case "errorRate":
          valA = a.errorRate;
          valB = b.errorRate;
          break;
        case "p50":
          valA = a.latency.p50;
          valB = b.latency.p50;
          break;
        case "p95":
          valA = a.latency.p95;
          valB = b.latency.p95;
          break;
        case "p99":
          valA = a.latency.p99;
          valB = b.latency.p99;
          break;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });

    return list;
  }, [routes, searchTerm, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return <Badge variant="info">GET</Badge>;
      case "POST":
        return <Badge variant="success">POST</Badge>;
      case "PUT":
      case "PATCH":
        return <Badge variant="warning">{method.toUpperCase()}</Badge>;
      case "DELETE":
        return <Badge variant="destructive">DELETE</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const getLatencyColorClass = (ms: number) => {
    if (ms < 100) return "text-emerald-600 dark:text-emerald-400 font-medium";
    if (ms < 300) return "text-amber-600 dark:text-amber-400 font-medium";
    return "text-rose-600 dark:text-rose-400 font-bold";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search API route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredRoutes.length} of {routes.length} tracked endpoints
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Method</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("route")}
              >
                <div className="flex items-center gap-1">
                  Route Path <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("totalRequests")}
              >
                <div className="flex items-center justify-end gap-1">
                  Requests <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("errorRate")}
              >
                <div className="flex items-center justify-end gap-1">
                  Errors <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("p50")}
              >
                <div className="flex items-center justify-end gap-1">
                  p50 (ms) <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("p90")}
              >
                p90 (ms)
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("p95")}
              >
                <div className="flex items-center justify-end gap-1">
                  p95 (ms) <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("p99")}
              >
                <div className="flex items-center justify-end gap-1">
                  p99 (ms) <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No active route metrics found matching filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutes.map((r, idx) => (
                <TableRow key={`${r.method}-${r.route}-${idx}`}>
                  <TableCell>{getMethodBadge(r.method)}</TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate" title={r.route}>
                    {r.route}
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.totalRequests}</TableCell>
                  <TableCell className="text-right">
                    {r.errorRate > 0 ? (
                      <span className="text-rose-500 font-semibold">{r.errorRate}%</span>
                    ) : (
                      <span className="text-muted-foreground">0%</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColorClass(r.latency.p50)}`}>
                    {r.latency.p50}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.latency.p90}
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColorClass(r.latency.p95)}`}>
                    {r.latency.p95}
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColorClass(r.latency.p99)}`}>
                    {r.latency.p99}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
