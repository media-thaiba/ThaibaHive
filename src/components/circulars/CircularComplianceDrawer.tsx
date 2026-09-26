"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Building2 } from "lucide-react";

interface CampusComplianceItem {
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  institutionType: string;
  status: "pending" | "acknowledged" | "in_progress" | "completed";
  completionEvidenceUrl?: string | null;
  coordinatorRemarks?: string | null;
  completedAt?: string | null;
}

interface ComplianceResponse {
  circularId: string;
  totalCampuses: number;
  completedCount: number;
  compliancePercentage: number;
  checklist: CampusComplianceItem[];
}

interface CircularComplianceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circularId: string | null;
  circularTitle: string;
  canManage?: boolean;
}

export function CircularComplianceDrawer({
  open,
  onOpenChange,
  circularId,
  circularTitle,
  canManage = true,
}: CircularComplianceDrawerProps) {
  const [data, setData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingRemarks, setEditingRemarks] = useState<{ [instId: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchCompliance = useCallback(async () => {
    if (!circularId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/circulars/${circularId}/compliance`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load compliance data");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load compliance status");
    } finally {
      setLoading(false);
    }
  }, [circularId]);

  useEffect(() => {
    if (open && circularId) {
      fetchCompliance();
    }
  }, [open, circularId, fetchCompliance]);

  const handleUpdateStatus = async (
    institutionId: string,
    newStatus: string,
    remarks?: string
  ) => {
    if (!circularId) return;
    setUpdatingId(institutionId);
    try {
      const res = await fetch(`/api/circulars/${circularId}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          status: newStatus,
          coordinatorRemarks: remarks !== undefined ? remarks : editingRemarks[institutionId],
        }),
      });

      if (res.ok) {
        await fetchCompliance();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">
                Campus Compliance Tracker
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5" title={circularTitle}>
                {circularTitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : data ? (
            <>
              {/* Compliance Summary Card */}
              <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {data.compliancePercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Overall Campus Compliance ({data.completedCount} of {data.totalCampuses} Completed)
                  </div>
                </div>

                <div className="w-48 bg-muted rounded-full h-3 overflow-hidden border">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${data.compliancePercentage}%` }}
                  />
                </div>
              </div>

              {/* Campus Checklist Table */}
              <div className="border rounded-md overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="p-3 font-semibold">Campus / Institution</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Coordinator Remarks</th>
                      {canManage && <th className="p-3 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.checklist.map((item) => (
                      <tr key={item.institutionId} className="hover:bg-muted/20">
                        <td className="p-3 font-medium">
                          <div>{item.institutionName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.institutionCode}</div>
                        </td>
                        <td className="p-3">
                          <span className="capitalize text-muted-foreground">{item.institutionType}</span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              item.status === "completed"
                                ? "success"
                                : item.status === "in_progress"
                                ? "warning"
                                : "secondary"
                            }
                            className="capitalize text-[10px]"
                          >
                            {item.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {canManage ? (
                            <Input
                              placeholder="Add review notes..."
                              className="h-7 text-xs"
                              defaultValue={item.coordinatorRemarks || ""}
                              onChange={(e) =>
                                setEditingRemarks((prev) => ({
                                  ...prev,
                                  [item.institutionId]: e.target.value,
                                }))
                              }
                              onBlur={(e) =>
                                handleUpdateStatus(item.institutionId, item.status, e.target.value)
                              }
                            />
                          ) : (
                            <span className="text-muted-foreground">{item.coordinatorRemarks || "—"}</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="p-3 text-right">
                            <Select
                              className="h-7 text-xs w-32 ml-auto"
                              value={item.status}
                              disabled={updatingId === item.institutionId}
                              onChange={(e) =>
                                handleUpdateStatus(item.institutionId, e.target.value)
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </Select>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
