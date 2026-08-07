"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScheduledJob } from "./jobs-list-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JobActionsPanelProps {
  job: ScheduledJob;
  onRefresh: () => void;
}

export function JobActionsPanel({ job, onRefresh }: JobActionsPanelProps) {
  const [isConfirmingCancel, setIsConfirmingCancel] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleStatusChange = async (targetStatus: "paused" | "cancelled" | "queued") => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/scheduled-jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Job status changed to ${targetStatus}`);
        onRefresh();
      } else {
        toast.error(data.error || "Failed to update job status");
      }
    } catch {
      toast.error("Failed to execute action");
    } finally {
      setIsUpdating(false);
      setIsConfirmingCancel(false);
    }
  };

  const showPause = job.status === "queued";
  const showResume = job.status === "paused";
  const showCancel = job.status === "queued" || job.status === "processing" || job.status === "paused";

  return (
    <div className="flex justify-end gap-2 items-center">
      {showPause && (
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          onClick={() => handleStatusChange("paused")}
        >
          Pause
        </Button>
      )}

      {showResume && (
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          onClick={() => handleStatusChange("queued")}
        >
          Resume
        </Button>
      )}

      {showCancel && (
        <Dialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
          <DialogTrigger render={
            <Button
              size="sm"
              variant="destructive"
              disabled={isUpdating}
            >
              Cancel
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Report Job</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this job? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmingCancel(false)}
                disabled={isUpdating}
              >
                No, Keep
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("cancelled")}
                disabled={isUpdating}
              >
                {isUpdating ? "Canceling..." : "Yes, Cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface TriggerJobDialogProps {
  onRefresh: () => void;
}

export function TriggerJobDialog({ onRefresh }: TriggerJobDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [type, setType] = React.useState<"attendance" | "finance" | "academics">("attendance");
  const [format, setFormat] = React.useState<"pdf" | "excel">("pdf");
  const [instId, setInstId] = React.useState("");
  const [optionsJson, setOptionsJson] = React.useState('{\n  "dateRange": "today"\n}');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instId.trim()) {
      toast.error("Institution ID is required");
      return;
    }

    let optionsObj = {};
    try {
      optionsObj = JSON.parse(optionsJson);
    } catch {
      toast.error("Invalid Options JSON syntax");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/scheduled-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          format,
          options: optionsObj,
          institutionId: instId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Job triggered successfully!");
        setOpen(false);
        // Reset form
        setInstId("");
        setOptionsJson('{\n  "dateRange": "today"\n}');
        onRefresh();
      } else {
        toast.error(data.error || "Failed to trigger report job");
      }
    } catch {
      toast.error("Failed to trigger job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="default">Trigger Manual Report</Button>
      } />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Trigger Report Execution</DialogTitle>
            <DialogDescription>
              Create a new report compiler task immediately in the database queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Report Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="attendance">Attendance</option>
                <option value="finance">Finance</option>
                <option value="academics">Academics</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Output Format</Label>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant={format === "pdf" ? "default" : "outline"}
                  onClick={() => setFormat("pdf")}
                  className="flex-1"
                  size="sm"
                >
                  PDF
                </Button>
                <Button
                  type="button"
                  variant={format === "excel" ? "default" : "outline"}
                  onClick={() => setFormat("excel")}
                  className="flex-1"
                  size="sm"
                >
                  Excel
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Institution ID</Label>
              <Input
                placeholder="e.g. inst_test_01"
                value={instId}
                onChange={(e) => setInstId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Options (JSON format)</Label>
              <Textarea
                className="font-mono min-h-[80px]"
                value={optionsJson}
                onChange={(e) => setOptionsJson(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Triggering..." : "Submit Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
