"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Clock,
  User,
  PlusCircle,
  Eye,
} from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type DailyReportTask = {
  id?: string;
  taskId: string | null;
  description: string;
  hoursSpent: number;
  status: string; // completed, in_progress
};

type DailyReport = {
  id: string;
  staffId: string;
  date: string;
  summary: string | null;
  status: string; // draft, submitted, reviewed, rejected
  reviewerComment: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  firstName?: string;
  lastName?: string;
};

type AssignedTask = {
  id: string;
  title: string;
  status: string;
};

const statusStyles: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  submitted: "warning",
  reviewed: "success",
  rejected: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting Review",
  reviewed: "Reviewed",
  rejected: "Rejected",
};

export default function ReportsPage() {
  const { staff } = useAuth();
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);

  // Form State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState("");
  const [reportStatus, setReportStatus] = useState<"draft" | "submitted">("submitted");
  const [linkedTasks, setLinkedTasks] = useState<DailyReportTask[]>([]);

  // View & Review State
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [selectedReportTasks, setSelectedReportTasks] = useState<DailyReportTask[]>([]);
  const [selectedReportLoading, setSelectedReportLoading] = useState(false);
  
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const isHodOrAdmin = staff ? ["super_admin", "admin", "hod"].includes(staff.role) : false;
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");

  const fetchReports = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.ok ? r.json() : { reports: [] })
      .then((data) => setReports(ensureArray(data.reports)))
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load daily reports");
      })
      .finally(() => setLoading(false));
  };

  const fetchMyTasks = () => {
    fetch("/api/tasks?scope=my")
      .then((r) => r.ok ? r.json() : { tasks: [] })
      .then((data) => setAssignedTasks(ensureArray(data.tasks)))
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchReports();
    fetchMyTasks();
  }, []);

  const handleAddLinkedTask = () => {
    setLinkedTasks(prev => [
      ...prev,
      { taskId: "", description: "", hoursSpent: 1, status: "completed" }
    ]);
  };

  const handleRemoveLinkedTask = (index: number) => {
    setLinkedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleLinkedTaskChange = (index: number, field: keyof DailyReportTask, value: any) => {
    setLinkedTasks(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const loadReportForEdit = async (report: DailyReport) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${report.id}`);
      if (!res.ok) throw new Error("Failed to fetch report details");
      const data = await res.json();
      
      setEditingReport(report);
      setReportDate(report.date);
      setSummary(report.summary || "");
      setReportStatus(report.status === "draft" ? "draft" : "submitted");
      setLinkedTasks(ensureArray(data.tasks).map((t: any) => ({
        taskId: t.taskId || "",
        description: t.description || "",
        hoursSpent: t.hoursSpent || 0,
        status: t.status || "completed",
      })));
      setShowForm(true);
    } catch (err) {
      toast.error("Failed to load report details for editing");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDate) {
      toast.error("Date is required");
      return;
    }
    
    // Validate tasks hours
    let totalHours = 0;
    for (const t of linkedTasks) {
      if (t.hoursSpent < 0.1 || t.hoursSpent > 24) {
        toast.error("Hours spent per task must be between 0.1 and 24.0");
        return;
      }
      totalHours += t.hoursSpent;
    }
    if (totalHours > 24) {
      toast.error("Total hours for a single day cannot exceed 24.0");
      return;
    }

    setLoading(true);
    try {
      const url = editingReport ? `/api/reports/${editingReport.id}` : "/api/reports";
      const method = editingReport ? "PUT" : "POST";
      const payload = {
        date: reportDate,
        summary: summary.trim(),
        status: reportStatus,
        tasks: linkedTasks.map(t => ({
          taskId: t.taskId || null,
          description: t.description.trim(),
          hoursSpent: t.hoursSpent,
          status: t.status,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingReport ? "Daily report updated successfully" : "Daily report submitted successfully");
        setShowForm(false);
        setEditingReport(null);
        setReportDate(new Date().toISOString().split("T")[0]);
        setSummary("");
        setLinkedTasks([]);
        fetchReports();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const viewReportDetails = async (report: DailyReport) => {
    setSelectedReport(report);
    setSelectedReportTasks([]);
    setSelectedReportLoading(true);
    
    try {
      const res = await fetch(`/api/reports/${report.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedReportTasks(ensureArray(data.tasks));
    } catch {
      toast.error("Failed to load report detail log");
    } finally {
      setSelectedReportLoading(false);
    }
  };

  const handleReviewAction = async (status: "reviewed" | "rejected") => {
    if (!selectedReport) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      toast.error("A comment is required when rejecting daily reports.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${selectedReport.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerComment: reviewNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Daily report marked as ${status === "reviewed" ? "reviewed" : "rejected"}`);
        setSelectedReport(null);
        setReviewNotes("");
        fetchReports();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit review");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Split reports into personal and pending (for HOD/Admin view)
  const myReports = reports.filter(r => r.staffId === staff?.id);
  const teamReports = reports.filter(r => r.staffId !== staff?.id);

  const displayList = activeTab === "my" ? myReports : teamReports;

  if (loading && reports.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Daily Activity Logs"
        actions={
          <Button onClick={() => {
            setEditingReport(null);
            setReportDate(new Date().toISOString().split("T")[0]);
            setSummary("");
            setLinkedTasks([]);
            setShowForm(true);
          }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        }
      />

      {/* Tabs */}
      {isHodOrAdmin && (
        <div className="flex gap-2 border-b pb-px">
          <Button
            variant={activeTab === "my" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("my")}
            className="font-medium"
          >
            My Reports
          </Button>
          <Button
            variant={activeTab === "team" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("team")}
            className="font-medium"
          >
            Team Reports ({teamReports.filter((r) => r.status === "submitted").length} Pending)
          </Button>
        </div>
      )}

      {/* Main List */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {activeTab === "my" ? "Personal Log History" : "Team Activity Logs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayList.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-12 w-12" />}
              title="No daily reports logged"
              description={
                activeTab === "my"
                  ? "Log your accomplishments and hours spent to keep your team aligned."
                  : "No team activity logs are waiting for review."
              }
              action={activeTab === "my" ? { label: "New Report", onClick: () => setShowForm(true) } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {displayList.map((rep) => (
                <div
                  key={rep.id}
                  className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Log for: {formatDate(rep.date)}
                      </span>
                      <Badge variant={statusStyles[rep.status] || "secondary"} className="capitalize text-[10px] py-0">
                        {statusLabels[rep.status] || rep.status}
                      </Badge>
                    </div>
                    {rep.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {rep.summary}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {activeTab === "team" && (rep.firstName || rep.lastName) && (
                        <span>Submitted by: <strong>{rep.firstName} {rep.lastName}</strong></span>
                      )}
                      <span>Logged on: {formatDate(rep.createdAt)}</span>
                    </div>

                    {/* Review Comments */}
                    {rep.reviewerComment && (
                      <div className="mt-2 rounded-lg bg-muted/60 p-2.5 text-xs border border-border/40">
                        <span className="font-semibold text-muted-foreground">Reviewer Comment: </span>
                        <span>{rep.reviewerComment}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                    <Button variant="outline" size="sm" onClick={() => viewReportDetails(rep)} className="gap-1 text-xs">
                      <Eye className="h-3.5 w-3.5" /> View Log
                    </Button>
                    {activeTab === "my" && ["draft", "rejected"].includes(rep.status) && (
                      <Button variant="secondary" size="sm" onClick={() => loadReportForEdit(rep)} className="text-xs">
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Report Modal */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingReport(null);
        }
      }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit Daily Activity Log" : "New Daily Activity Log"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitReport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Log Date
                </label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <Select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as "draft" | "submitted")}
                  required
                >
                  <option value="submitted">Submit for Review</option>
                  <option value="draft">Save as Draft</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Summary of Accomplishments
              </label>
              <Textarea
                placeholder="Briefly describe what you worked on today..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Linked Tasks Section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Linked Tasks & Hours
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLinkedTask} className="gap-1 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" /> Add Task
                </Button>
              </div>

              {linkedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg">
                  No specific tasks linked. Click Add Task above to record detailed breakdown.
                </p>
              ) : (
                <div className="space-y-3">
                  {linkedTasks.map((t, idx) => (
                    <div key={idx} className="rounded-lg border p-3 bg-muted/10 space-y-2 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveLinkedTask(idx)}
                        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Associated Project Task</label>
                        <Select
                          value={t.taskId || ""}
                          onChange={(e) => handleLinkedTaskChange(idx, "taskId", e.target.value)}
                        >
                          <option value="">General Work (No linked task)</option>
                          {assignedTasks.map(task => (
                            <option key={task.id} value={task.id}>
                              [{task.status.toUpperCase()}] {task.title}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">What was done</label>
                          <Input
                            placeholder="e.g. Fixed navigation state bugs..."
                            value={t.description}
                            onChange={(e) => handleLinkedTaskChange(idx, "description", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Hours spent</label>
                          <Input
                            type="number"
                            min="0.1"
                            max="24"
                            step="0.1"
                            value={t.hoursSpent}
                            onChange={(e) => handleLinkedTaskChange(idx, "hoursSpent", parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Task End Status</label>
                        <Select
                          value={t.status}
                          onChange={(e) => handleLinkedTaskChange(idx, "status", e.target.value)}
                          required
                        >
                          <option value="completed">Completed</option>
                          <option value="in_progress">Still in progress</option>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <p className="text-right text-xs text-muted-foreground">
                    Total Hours Logged: <strong>{linkedTasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0).toFixed(1)} / 24.0</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowForm(false);
                setEditingReport(null);
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {reportStatus === "draft" ? "Save Draft" : "Submit Activity Log"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details & Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Daily Activity Log Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-5">
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Log for {formatDate(selectedReport.date)}</h3>
                    {selectedReport.firstName && (
                      <p className="text-xs text-muted-foreground mt-0.5">Submitted by: {selectedReport.firstName} {selectedReport.lastName}</p>
                    )}
                  </div>
                  <Badge variant={statusStyles[selectedReport.status] || "secondary"} className="capitalize">
                    {statusLabels[selectedReport.status] || selectedReport.status}
                  </Badge>
                </div>

                <div className="text-xs border-t pt-2.5">
                  <span className="text-muted-foreground block mb-1">Daily Summary:</span>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedReport.summary || "No summary provided."}</p>
                </div>
              </div>

              {/* Tasks Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tasks Breakdown
                </h4>
                {selectedReportLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : selectedReportTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/10 rounded-lg">
                    No individual task logs linked to this report.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedReportTasks.map((t, idx) => (
                      <div key={idx} className="rounded-lg border p-3 text-xs bg-muted/5 space-y-1.5">
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">{t.description}</span>
                          <span className="text-primary shrink-0">{t.hoursSpent} hr{t.hoursSpent !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Task Link: {t.taskId ? "Yes" : "General Work"}</span>
                          <span className="capitalize font-medium">Status: {t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review notes if any */}
              {selectedReport.reviewerComment && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs border border-border/40">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="h-3.5 w-3.5" /> Review Comment
                  </span>
                  <p className="leading-relaxed">{selectedReport.reviewerComment}</p>
                </div>
              )}

              {/* Review Input for HODs (only if status is submitted) */}
              {isHodOrAdmin && selectedReport.status === "submitted" && selectedReport.staffId !== staff?.id && (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Add HOD Review Comments
                  </h4>
                  <Textarea
                    placeholder="Enter review comments (required for rejection)..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    maxLength={500}
                    rows={2}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedReport(null)}
                      disabled={reviewSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleReviewAction("rejected")}
                      disabled={reviewSubmitting}
                    >
                      Reject Log
                    </Button>
                    <Button
                      type="button"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => handleReviewAction("reviewed")}
                      disabled={reviewSubmitting}
                    >
                      Mark Reviewed
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
