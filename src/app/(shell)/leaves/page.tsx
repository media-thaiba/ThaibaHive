"use client";

/**
 * Leaves Page
 * Migrated to TanStack Query (P2-46) and Central API Client (P2-47).
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/export-button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Calendar } from "lucide-react";
import { formatDate, formatDateRange } from "@/lib/utils";
import {
  useLeaves,
  useLeaveTypes,
  useLeaveBalances,
  useCreateLeave,
  useCancelLeave,
  type LeaveRequest,
} from "@/lib/hooks/use-leaves";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  cancelled: "secondary",
};

export default function LeavesPage() {
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ leaveTypeId: "", startDate: today, endDate: today, daysCount: 1, reason: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // TanStack Query Hooks
  const { data: leaves = [], isLoading: loadingLeaves } = useLeaves({ dateFrom, dateTo });
  const { data: leaveTypes = [], isLoading: loadingTypes } = useLeaveTypes();
  const { data: balances = [] } = useLeaveBalances();

  const createMutation = useCreateLeave();
  const cancelMutation = useCancelLeave();

  const loading = loadingLeaves || loadingTypes;

  // Auto-select first leave type if form doesn't have one selected
  if (leaveTypes.length > 0 && !form.leaveTypeId) {
    setForm((prev) => ({ ...prev, leaveTypeId: leaveTypes[0].id }));
  }

  function calcDays(start: string, end: string) {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  async function applyLeave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(form);
      setShowForm(false);
      setForm({ leaveTypeId: form.leaveTypeId, startDate: today, endDate: today, daysCount: 1, reason: "" });
      toast.success("Leave application submitted successfully. Your HOD will review it.");
    } catch {
      toast.error("Failed to submit leave application. Please try again.");
    }
  }

  async function handleCancelLeave(id: string) {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Leave application cancelled.");
      setConfirmDeleteId(null);
    } catch {
      toast.error("Failed to cancel leave application.");
    }
  }

  const days = calcDays(form.startDate, form.endDate);
  const selectedType = leaveTypes.find((lt) => lt.id === form.leaveTypeId);
  const approvedDays = leaves.filter((l) => l.status === "approved").reduce((sum, l) => sum + l.daysCount, 0);
  const totalAllowed = selectedType?.daysAllowed || 0;
  const remaining = totalAllowed - approvedDays;

  const leaveToCancel = confirmDeleteId ? leaves.find((l) => l.id === confirmDeleteId) : null;

  if (loading) return <div className="flex-1 p-6 lg:p-8"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Leave Requests"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Apply Leave"}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto max-w-[160px]" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto max-w-[160px]" />
        </div>
        <ExportButton type="leaves" params={{ dateFrom, dateTo }} />
      </div>

      {/* Leave Balances */}
      {balances.length > 0 && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Leave Balances ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {balances.map((b) => {
                const remaining = b.totalDays - b.usedDays;
                const pct = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0;
                return (
                  <div key={b.id} className="rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">{b.leaveTypeCode || b.leaveTypeName}</span>
                      <span className="text-[10px] text-muted-foreground">{b.usedDays}/{b.totalDays}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{remaining} remaining</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Form */}
      {showForm && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">New Leave Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyLeave} className="space-y-3">
              <Select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
                <option value="">Select leave type...</option>
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.daysAllowed} days)</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value > form.endDate ? e.target.value : form.endDate })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">End Date</label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              {form.startDate && form.endDate && (
                <p className="text-xs text-muted-foreground">
                  {days} day{days > 1 ? "s" : ""}
                  {selectedType && remaining > 0 && remaining < totalAllowed && ` \u00b7 ${remaining} of ${totalAllowed} days remaining`}
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                <Textarea placeholder="Reason for leave" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : `Apply for ${days} day${days > 1 ? "s" : ""}`}
              </Button>
              <p className="text-xs text-muted-foreground">Your HOD will review this request. You will be notified once it is approved or rejected.</p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave History */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base">My Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No leave applications yet"
              description="Apply for leave to get started."
              action={{ label: "Apply Leave", href: "/leaves" }}
            />
          ) : (
            <div className="space-y-2">
              {leaves.map((l: LeaveRequest) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{formatDateRange(l.startDate, l.endDate)} ({l.daysCount} day{l.daysCount > 1 ? "s" : ""})</p>
                    {l.reason && <p className="text-xs text-muted-foreground mt-0.5">{l.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[l.status] || "secondary"} className="capitalize">{l.status}</Badge>
                    {l.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(l.id)} disabled={cancelMutation.isPending && cancelMutation.variables === l.id}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveToCancel
                ? `This will cancel your leave request for ${formatDate(leaveToCancel.startDate)} to ${formatDate(leaveToCancel.endDate)}. This action cannot be undone.`
                : "This will cancel your leave request. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleCancelLeave(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
