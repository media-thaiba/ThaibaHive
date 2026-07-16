"use client";

import { useState, useEffect, useCallback } from "react";
import { ExportButton } from "@/components/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Download,
  ClipboardList
} from "lucide-react";

type ReportTask = { 
  id?: string;
  description: string; 
  hoursSpent: number; 
};

type Report = { 
  id: string; 
  date: string; 
  summary: string | null; 
  status: string;
  firstName?: string;
  lastName?: string;
  staffId?: string;
};

type Permissions = { role: string; permissions: string[] };

const statusVariant: Record<string, "info" | "success" | "destructive" | "secondary"> = {
  draft: "secondary",
  submitted: "info",
  reviewed: "success",
  rejected: "destructive",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Selected report for review panel
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: Report;
    tasks: ReportTask[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form State
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split("T")[0], 
    summary: "" 
  });
  const [reportTasks, setReportTasks] = useState<ReportTask[]>([]);

  // Filters / Export States
  const [payrollDateFrom, setPayrollDateFrom] = useState("");
  const [payrollDateTo, setPayrollDateTo] = useState("");
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isReviewer = ["super_admin", "admin", "principal", "hod"].includes(permissions?.role || "");

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      const d = await res.json();
      setReports(Array.isArray(d.reports) ? d.reports : []);
    } catch {
      toast.error("Failed to load work reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/permissions");
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  const fetchReportDetails = useCallback(async (reportId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReportDetails(data);
      }
    } catch {
      toast.error("Failed to load report tasks");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    loadPermissions();
  }, [fetchReports, loadPermissions]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportDetails(selectedReportId);
    } else {
      setSelectedReportDetails(null);
    }
  }, [selectedReportId, fetchReportDetails]);

  const addTask = () => {
    setReportTasks([...reportTasks, { description: "", hoursSpent: 0 }]);
  };

  const updateTask = (i: number, field: keyof ReportTask, value: string | number) => {
    const updated = [...reportTasks];
    if (field === "description") updated[i].description = value as string;
    if (field === "hoursSpent") updated[i].hoursSpent = value as number;
    setReportTasks(updated);
  };

  const removeTask = (i: number) => {
    setReportTasks(reportTasks.filter((_, idx) => idx !== i));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) {
      setError("Date is required");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          summary: form.summary,
          tasks: reportTasks.filter((t) => t.description.trim()),
        }),
      });

      if (res.ok) {
        setSuccess("Report submitted successfully.");
        toast.success("Work report submitted");
        setShowForm(false);
        setForm({ date: new Date().toISOString().split("T")[0], summary: "" });
        setReportTasks([]);
        fetchReports();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (status: "reviewed" | "rejected") => {
    if (!selectedReportId) return;
    try {
      const res = await fetch(`/api/reports/${selectedReportId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Report status updated to ${status}`);
        fetchReports();
        setSelectedReportId(null);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update review status");
      }
    } catch {
      toast.error("Network error. Failed to review report.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Daily Work Reports
        </h1>
        {!isReviewer && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> New Report</>}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Payroll / Report Export Section */}
      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Payroll & Work Logs Export
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex items-center flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">From:</span>
            <Input 
              type="date" 
              value={payrollDateFrom} 
              onChange={(e) => setPayrollDateFrom(e.target.value)} 
              className="w-36 h-8 text-xs" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">To:</span>
            <Input 
              type="date" 
              value={payrollDateTo} 
              onChange={(e) => setPayrollDateTo(e.target.value)} 
              className="w-36 h-8 text-xs" 
            />
          </div>
          <ExportButton 
            type="payroll" 
            params={{ dateFrom: payrollDateFrom, dateTo: payrollDateTo }} 
            label="Export logs (CSV)" 
          />
        </CardContent>
      </Card>

      {/* New Report Form */}
      {showForm && !isReviewer && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Submit Daily Work Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Work Date</label>
                <Input 
                  type="date" 
                  value={form.date} 
                  onChange={(e) => setForm({ ...form, date: e.target.value })} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">EOD Summary</label>
                <Textarea 
                  placeholder="Summary of today's progress..."
                  value={form.summary} 
                  onChange={(e) => setForm({ ...form, summary: e.target.value })} 
                  rows={3} 
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-xs font-bold text-foreground">Tasks Completed</span>
                  <Button type="button" variant="ghost" size="sm" onClick={addTask} className="h-7 text-[11px]">
                    <Plus className="h-3 w-3 mr-1" /> Add Task Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {reportTasks.map((task, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input 
                        placeholder="What did you complete?" 
                        value={task.description} 
                        onChange={(e) => updateTask(i, "description", e.target.value)} 
                        className="flex-1 text-xs h-8" 
                        required
                      />
                      <Input 
                        type="number" 
                        placeholder="Hours" 
                        value={task.hoursSpent || ""} 
                        onChange={(e) => updateTask(i, "hoursSpent", Number(e.target.value))} 
                        className="w-20 text-xs h-8" 
                        required
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(i)} className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {reportTasks.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Add at least one completed task item.</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={submitting || reportTasks.length === 0} className="w-full">
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Board Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Report List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Submitted Reports</h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground text-left">
                  <th className="px-4 py-3">Date</th>
                  {isReviewer && <th className="px-4 py-3">Staff Employee</th>}
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => setSelectedReportId(r.id)}
                    className={`border-b last:border-0 hover:bg-muted/10 cursor-pointer transition-colors ${
                      selectedReportId === r.id ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" /> {r.date}
                    </td>
                    {isReviewer && (
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.firstName} {r.lastName}
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{r.summary || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={statusVariant[r.status] || "secondary"} className="capitalize">
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reports.length === 0 && (
              <div className="py-8">
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="No work reports submitted"
                  description="When reports are filed, they will show up here."
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Details & Review Panel */}
        <div className="space-y-4">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold">Review & Tasks Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
              {selectedReportId && selectedReportDetails ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-semibold text-muted-foreground">Date: {selectedReportDetails.report.date}</span>
                      <Badge variant={statusVariant[selectedReportDetails.report.status]}>
                        {selectedReportDetails.report.status}
                      </Badge>
                    </div>

                    {isReviewer && (
                      <p className="font-semibold flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-primary" /> Staff: {selectedReportDetails.report.firstName} {selectedReportDetails.report.lastName}
                      </p>
                    )}

                    <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border">
                      <p className="font-semibold text-[10px] text-muted-foreground">EOD Summary:</p>
                      <p className="leading-relaxed text-xs">{selectedReportDetails.report.summary || "No summary provided"}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold text-[10px] text-muted-foreground">Completed Task Breakdown:</p>
                      <div className="space-y-1.5">
                        {selectedReportDetails.tasks.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-muted/40 p-2 rounded border border-dashed text-xs">
                            <span className="truncate pr-2 font-medium">{t.description}</span>
                            <span className="flex items-center gap-0.5 shrink-0 bg-primary/10 text-primary font-semibold py-0.5 px-1.5 rounded text-[10px]">
                              <Clock className="h-3 w-3" /> {t.hoursSpent} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Review Actions Panel */}
                  {isReviewer && selectedReportDetails.report.status === "submitted" && (
                    <div className="border-t pt-4 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" /> Evaluate Work Log
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="h-9 text-xs border-success/20 text-success hover:bg-success/10"
                          onClick={() => handleReviewAction("reviewed")}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approved
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReviewAction("rejected")}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : loadingDetails ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center h-full">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2 animate-pulse" />
                  <p className="text-xs">Select a report from the table to view the completed tasks list and perform reviews.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
