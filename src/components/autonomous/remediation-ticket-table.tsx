"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Ticket {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  status: string;
  assignedStaffId?: string | null;
  autoCreated: boolean;
  createdAt: string;
}

export function RemediationTicketTable({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
        <p className="text-sm text-slate-400">No active remediation tickets found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden backdrop-blur">
      <Table>
        <TableHeader className="bg-slate-950/60">
          <TableRow className="border-slate-800">
            <TableHead className="text-slate-400">Ticket ID</TableHead>
            <TableHead className="text-slate-400">Title</TableHead>
            <TableHead className="text-slate-400">Severity</TableHead>
            <TableHead className="text-slate-400">Category</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Assigned Staff</TableHead>
            <TableHead className="text-slate-400">Creation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id} className="border-slate-800/60 hover:bg-slate-800/40">
              <TableCell className="font-mono text-xs text-indigo-300">{t.id}</TableCell>
              <TableCell className="font-medium text-slate-100">{t.title}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    t.severity === "critical"
                      ? "destructive"
                      : t.severity === "high"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {t.severity}
                </Badge>
              </TableCell>
              <TableCell className="capitalize text-slate-300">{t.category}</TableCell>
              <TableCell>
                <Badge variant={t.status === "resolved" ? "success" : "info"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {t.assignedStaffId ? t.assignedStaffId : "Unassigned"}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {t.autoCreated ? "Auto (Self-Healing)" : "Manual"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
