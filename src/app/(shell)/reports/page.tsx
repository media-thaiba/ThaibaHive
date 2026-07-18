"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type Report = {
  id: string;
  date: string;
  summary: string | null;
  status: string;
  staffId: string;
  firstName: string;
  lastName: string;
  reviewerComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type ReportTask = {
  id: string;
  reportId: string;
  taskId: string | null;
  description: string;
  hoursSpent: number | null;
  status: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  assignee?: { firstName: string; lastName: string } | null;
};

type ReportDetail = {
  report: Report;
  tasks: ReportTask[];
};

type Tab = "my" | "team";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "secondary"> = {
  draft: "secondary",
  submitted: "info",
  reviewed: "success",
  rejected: "destructive",
};

const TASK_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "partial", label: "Partial" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("my");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Detail / Review
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create / Edit form
  const [editReportId, setEditReportId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSummary, setFormSummary] = useState("");
  const [formTasks, setFormTasks] = useState<
    { taskId: string; description: string; hoursSpent: number; status: string }[]
  >([]);
  const [formSaving, setFormSaving] = useState(false);
  const [myTasks, setMyTasks] = useState<Task[]>([]);

  // Review form
  const [reviewAction, setReviewAction] = useState<"reviewed" | "rejected">("reviewed");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(ensureArray(data.reports));
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openCreateDialog = async () => {
    setEditReportId(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormSummary("");
    setFormTasks([]);
    setCreateOpen(true);
    // Fetch my tasks
    try {
      const res = await fetch("/api/tasks?scope=my");
      const data = await res.json();
      setMyTasks(ensureArray(data.tasks));
    } catch {
      setMyTasks([]);
    }
  };

  const openEditDialog = async (report: Report) => {
    setEditReportId(report.id);
    setFormDate(report.date);
    setFormSummary(report.summary || "");
    setCreateOpen(true);
    // Fetch report detail + my tasks
    try {
      const [reportRes, tasksRes] = await Promise.all([
        fetch(`/api/reports/${report.id}`),
        fetch("/api/tasks?scope=my"),
      ]);
      const reportData: ReportDetail = await reportRes.json();
      const tasksData = await tasksRes.json();
      setMyTasks(ensureArray(tasksData.tasks));
      setFormTasks(
        (ensureArray(reportData.tasks) as ReportTask[]).map((t) => ({
          taskId: t.taskId || "",
          description: t.description,
          hoursSpent: t.hoursSpent || 0,
          status: t.status || "completed",
        }))
      );
    } catch {
      toast.error("Failed to load report details");
    }
  };

  const openDetailDialog = async (report: Report) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`);
      const data: ReportDetail = await res.json();
      setSelectedReport(data);
    } catch {
      toast.error("Failed to load report details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openReviewDialog = async (report: Report) => {
    setDetailLoading(true);
    setReviewOpen(true);
    setReviewAction("reviewed");
    setReviewComment("");
    try {
      const res = await fetch(`/api/reports/${report.id}`);
      const data: ReportDetail = await res.json();
      setSelectedReport(data);
    } catch {
      toast.error("Failed to load report details");
    } finally {
      setDetailLoading(false);
    }
  };

  const addFormTask = () => {
    setFormTasks([...formTasks, { taskId: "", description: "", hoursSpent: 0, status: "completed" }]);
  };

  const removeFormTask = (index: number) => {
    setFormTasks(formTasks.filter((_, i) => i !== index));
  };

  const updateFormTask = (index: number, field: string, value: any) => {
    const updated = [...formTasks];
    (updated[index] as any)[field] = value;
    // Auto-fill description from task title when selecting a task
    if (field === "taskId" && value) {
      const task = myTasks.find((t) => t.id === value);
      if (task && !updated[index].description) {
        updated[index].description = task.title;
      }
    }
    setFormTasks(updated);
  };

  const totalHours = formTasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);

  const handleSave = async (status: "draft" | "submitted") => {
    if (!formDate) {
      toast.error("Date is required");
      return;
    }
    if (formTasks.length === 0) {
      toast.error("Add at least one task");
      return;
    }
    for (const t of formTasks) {
      if (!t.description.trim()) {
        toast.error("Each task needs a description");
        return;
      }
      if (t.hoursSpent < 0.1 || t.hoursSpent > 24) {
        toast.error("Hours must be between 0.1 and 24.0");
        return;
      }
    }
    if (totalHours > 24) {
      toast.error("Total hours cannot exceed 24.0");
      return;
    }

    setFormSaving(true);
    try {
      const url = editReportId ? `/api/reports/${editReportId}` : "/api/reports";
      const method = editReportId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          summary: formSummary,
          status,
          tasks: formTasks.map((t) => ({
            taskId: t.taskId || undefined,
            description: t.description,
            hoursSpent: t.hoursSpent,
            status: t.status,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save report");
        return;
      }
      toast.success(editReportId ? "Report updated" : `Report ${status === "draft" ? "saved as draft" : "submitted"}`);
      setCreateOpen(false);
      fetchReports();
    } catch {
      toast.error("Failed to save report");
    } finally {
      setFormSaving(false);
    }
  };

  const handleReview = async () => {
    if (!selectedReport) return;
    if (reviewAction === "rejected" && !reviewComment.trim()) {
      toast.error("A comment is required when rejecting a report");
      return;
    }
    setReviewSaving(true);
    try {
      const res = await fetch(`/api/reports/${selectedReport.report.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewAction,
          reviewerComment: reviewComment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to review report");
        return;
      }
      toast.success(`Report ${reviewAction === "reviewed" ? "approved" : "rejected"}`);
      setReviewOpen(false);
      fetchReports();
    } catch {
      toast.error("Failed to review report");
    } finally {
      setReviewSaving(false);
    }
  };

  const myReports = reports.filter((r) => r.status === "draft" || r.staffId === undefined || true);
  const teamReports = reports.filter((r) => r.status !== "draft");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Reports"
        description="Submit and manage daily work reports."
        actions={
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Report
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "my"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Reports
        </button>
        <button
          onClick={() => setTab("team")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "team"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Team Submissions
        </button>
      </div>

      {/* Report List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (tab === "my" ? myReports : teamReports).length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={tab === "my" ? "No reports yet" : "No team submissions"}
          description={
            tab === "my"
              ? "Create your first daily report to get started."
              : "No submitted reports from your team members yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {(tab === "my" ? myReports : teamReports).map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{formatDate(report.date)}</span>
                      <Badge variant={STATUS_VARIANT[report.status] || "default"}>
                        {report.status}
                      </Badge>
                    </div>
                    {tab === "team" && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {report.firstName} {report.lastName}
                      </p>
                    )}
                    {report.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.summary}
                      </p>
                    )}
                    {report.reviewerComment && report.status === "rejected" && (
                      <p className="text-sm text-destructive mt-1 line-clamp-2">
                        Rejection reason: {report.reviewerComment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailDialog(report);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(report.status === "draft" || report.status === "rejected") &&
                      report.staffId === undefined && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(report);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    {(report.status === "draft" || report.status === "rejected") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(report);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {tab === "team" && report.status === "submitted" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReviewDialog(report);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editReportId ? "Edit Daily Report" : "New Daily Report"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="report-date">Date</Label>
                <Input
                  id="report-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Hours: {totalHours.toFixed(1)} / 24.0</Label>
                <div className="mt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        totalHours > 24
                          ? "bg-destructive"
                          : totalHours > 8
                          ? "bg-warning"
                          : "bg-primary"
                      }`}
                      style={{ width: `${Math.min((totalHours / 24) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {totalHours > 24 && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Total exceeds 24 hours
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="report-summary">Summary</Label>
              <Textarea
                id="report-summary"
                placeholder="Brief summary of your day..."
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tasks</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFormTask}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Task
                </Button>
              </div>

              {formTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks added yet. Click &quot;Add Task&quot; to begin.
                </p>
              ) : (
                <div className="space-y-3">
                  {formTasks.map((task, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Select
                              value={task.taskId}
                              onChange={(e) => updateFormTask(index, "taskId", e.target.value)}
                            >
                              <option value="">Select a task...</option>
                              {myTasks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.title}
                                </SelectItem>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Input
                              placeholder="Task description"
                              value={task.description}
                              onChange={(e) =>
                                updateFormTask(index, "description", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="24"
                            placeholder="Hrs"
                            className="w-20"
                            value={task.hoursSpent || ""}
                            onChange={(e) =>
                              updateFormTask(
                                index,
                                "hoursSpent",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <Select
                            value={task.status}
                            onChange={(e) => updateFormTask(index, "status", e.target.value)}
                          >
                            {TASK_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeFormTask(index)}
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={formSaving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={formSaving}
            >
              Save as Draft
            </Button>
            <Button onClick={() => handleSave("submitted")} disabled={formSaving}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedReport ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatDate(selectedReport.report.date)}
                </span>
                <Badge variant={STATUS_VARIANT[selectedReport.report.status] || "default"}>
                  {selectedReport.report.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                By {selectedReport.report.firstName} {selectedReport.report.lastName}
              </p>
              {selectedReport.report.summary && (
                <p className="text-sm">{selectedReport.report.summary}</p>
              )}
              {selectedReport.report.reviewerComment && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Reviewer Comment
                  </p>
                  <p className="text-sm">{selectedReport.report.reviewerComment}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">
                  Tasks ({selectedReport.tasks.length})
                </p>
                {selectedReport.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks logged.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedReport.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                      >
                        <span className="flex-1">{t.description}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {t.status}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.hoursSpent}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedReport ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatDate(selectedReport.report.date)}
                </span>
                <Badge variant="info">submitted</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                By {selectedReport.report.firstName} {selectedReport.report.lastName}
              </p>
              {selectedReport.report.summary && (
                <p className="text-sm">{selectedReport.report.summary}</p>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">
                  Tasks ({selectedReport.tasks.length})
                </p>
                {selectedReport.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <span className="flex-1">{t.description}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {t.status}
                      </Badge>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.hoursSpent}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <Label>Decision</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={reviewAction === "reviewed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReviewAction("reviewed")}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewAction === "rejected" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setReviewAction("rejected")}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="review-comment">
                  Comment {reviewAction === "rejected" && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="review-comment"
                  placeholder={
                    reviewAction === "rejected"
                      ? "Provide a reason for rejection..."
                      : "Optional feedback..."
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={reviewSaving}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === "rejected" ? "destructive" : "default"}
              onClick={handleReview}
              disabled={reviewSaving || !selectedReport}
            >
              {reviewAction === "reviewed" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
