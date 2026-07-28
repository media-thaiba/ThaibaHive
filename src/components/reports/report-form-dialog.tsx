"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureArray } from "@/lib/utils";

type DailyReportTask = {
  taskId: string | null;
  description: string;
  hoursSpent: number;
  status: string;
};

type DailyReport = {
  id: string;
  staffId: string;
  date: string;
  summary: string | null;
  status: string;
};

type AssignedTask = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReport: DailyReport | null;
  onSubmitted: () => void;
};

export function ReportFormDialog({ open, onOpenChange, editingReport, onSubmitted }: Props) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState("");
  const [reportStatus, setReportStatus] = useState<"draft" | "submitted">("submitted");
  const [linkedTasks, setLinkedTasks] = useState<DailyReportTask[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/tasks?scope=my")
        .then((r) => r.ok ? r.json() : { tasks: [] })
        .then((data) => setAssignedTasks(ensureArray(data.tasks)))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (editingReport && open) {
      setReportDate(editingReport.date);
      setSummary(editingReport.summary || "");
      setReportStatus(editingReport.status === "draft" ? "draft" : "submitted");
      setLoading(true);
      fetch(`/api/reports/${editingReport.id}`)
        .then((r) => r.ok ? r.json() : { tasks: [] })
        .then((data) => {
          setLinkedTasks((ensureArray(data.tasks) as Partial<DailyReportTask>[]).map((t) => ({
            taskId: t.taskId || null,
            description: t.description || "",
            hoursSpent: t.hoursSpent || 0,
            status: t.status || "completed",
          })));
        })
        .catch(() => setLinkedTasks([]))
        .finally(() => setLoading(false));
    } else if (open) {
      setReportDate(new Date().toISOString().split("T")[0]);
      setSummary("");
      setReportStatus("submitted");
      setLinkedTasks([]);
    }
  }, [editingReport, open]);

  const addTask = () => setLinkedTasks(prev => [...prev, { taskId: null, description: "", hoursSpent: 1, status: "completed" }]);
  const removeTask = (i: number) => setLinkedTasks(prev => prev.filter((_, idx) => idx !== i));
  const updateTask = (i: number, field: keyof DailyReportTask, value: string | number | null) => {
    setLinkedTasks(prev => { const c = [...prev]; c[i] = { ...c[i], [field]: value }; return c; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDate) { toast.error("Date is required"); return; }
    for (const t of linkedTasks) {
      if (t.hoursSpent < 0.1 || t.hoursSpent > 24) { toast.error("Hours per task must be between 0.1 and 24.0"); return; }
    }
    if (linkedTasks.reduce((s, t) => s + t.hoursSpent, 0) > 24) { toast.error("Total hours cannot exceed 24.0"); return; }

    setLoading(true);
    try {
      const url = editingReport ? `/api/reports/${editingReport.id}` : "/api/reports";
      const res = await fetch(url, {
        method: editingReport ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: reportDate,
          summary: summary.trim(),
          status: reportStatus,
          tasks: linkedTasks.map(t => ({ taskId: t.taskId || null, description: t.description.trim(), hoursSpent: t.hoursSpent, status: t.status })),
        }),
      });
      if (res.ok) {
        toast.success(editingReport ? "Report updated" : "Report submitted");
        onOpenChange(false);
        onSubmitted();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit report");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReport ? "Edit Daily Activity Log" : "New Daily Activity Log"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Log Date</label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as "draft" | "submitted")} required>
                <option value="submitted">Submit for Review</option>
                <option value="draft">Save as Draft</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</label>
            <Textarea placeholder="Briefly describe what you worked on today..." value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} required />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Linked Tasks & Hours</h4>
              <Button type="button" variant="outline" size="sm" onClick={addTask} className="gap-1 text-xs">
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
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeTask(idx)} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Associated Project Task</label>
                      <Select value={t.taskId || ""} onChange={(e) => updateTask(idx, "taskId", e.target.value)}>
                        <option value="">General Work (No linked task)</option>
                        {assignedTasks.map(task => (
                          <option key={task.id} value={task.id}>[{task.status.toUpperCase()}] {task.title}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">What was done</label>
                        <Input placeholder="e.g. Fixed navigation state bugs..." value={t.description} onChange={(e) => updateTask(idx, "description", e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Hours spent</label>
                        <Input type="number" min="0.1" max="24" step="0.1" value={t.hoursSpent} onChange={(e) => updateTask(idx, "hoursSpent", parseFloat(e.target.value) || 0)} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Task End Status</label>
                      <Select value={t.status} onChange={(e) => updateTask(idx, "status", e.target.value)} required>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {reportStatus === "draft" ? "Save Draft" : "Submit Activity Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
