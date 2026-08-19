"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MarkModerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markEntryId: string;
  currentMarks: number | null;
  maxMarks: number;
  onSuccess?: () => void;
}

export function MarkModerationModal({
  open,
  onOpenChange,
  markEntryId,
  currentMarks,
  maxMarks,
  onSuccess,
}: MarkModerationModalProps) {
  const [action, setAction] = useState<"approve" | "adjust">("approve");
  const [adjustedMarks, setAdjustedMarks] = useState<number>(currentMarks || 0);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/examinations/marks/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markEntryId,
          action,
          adjustedMarks: action === "adjust" ? adjustedMarks : undefined,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Moderation failed");

      alert("Mark moderation recorded successfully.");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || "Moderation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>HOD / Controller Mark Moderation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-foreground">Moderation Action</label>
            <div className="flex gap-2 mt-1">
              <Button
                variant={action === "approve" ? "default" : "outline"}
                size="sm"
                onClick={() => setAction("approve")}
              >
                Approve As Is
              </Button>
              <Button
                variant={action === "adjust" ? "default" : "outline"}
                size="sm"
                onClick={() => setAction("adjust")}
              >
                Adjust / Grace Mark
              </Button>
            </div>
          </div>

          {action === "adjust" && (
            <div>
              <label className="text-xs font-medium text-foreground">Adjusted Mark (Max: {maxMarks})</label>
              <Input
                type="number"
                value={adjustedMarks}
                onChange={(e) => setAdjustedMarks(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-foreground">Audit Reason Notes</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Approved grace mark of +2 per committee review"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Confirm Moderation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
