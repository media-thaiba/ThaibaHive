"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueueItem } from "./ApprovalQueue";
import { ApprovalDecisionPanel } from "./ApprovalDecisionPanel";
import { toast } from "sonner";
import { ShieldAlert, FileText,  } from "lucide-react";

interface ApprovalModalProps {
  item: QueueItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApprovalModal({ item, onClose, onSuccess }: ApprovalModalProps) {
  const [action, setAction] = useState<"approve" | "reject" | "return">("approve");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitDecision = () => {
    if (action === "reject" && !notes.trim()) {
      toast.error("Rejection notes are required when rejecting a request.");
      return;
    }

    setIsSubmitting(true);
    fetch("/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: item.id,
        requestType: item.type,
        action,
        notes,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit approval decision");
        return res.json();
      })
      .then(() => {
        toast.success(`Request ${action} decision processed successfully.`);
        onSuccess();
      })
      .catch((err) => {
        toast.error(err.message || "Error submitting decision");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Review {item.type.toUpperCase()} #{item.id.slice(0, 8)}
            </DialogTitle>
            {item.isEmergency && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Emergency
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 border text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Title:</span>
              <span className="font-semibold">{item.title}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Submitted By:</span>
              <span>{item.submittedBy}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium">Date Submitted:</span>
              <span>{new Date(item.submittedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Amount:</span>
              <span className="font-bold text-foreground">
                {item.amount !== null ? `$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "N/A"}
              </span>
            </div>
          </div>

          <ApprovalDecisionPanel
            action={action}
            onActionChange={setAction}
            notes={notes}
            onNotesChange={setNotes}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitDecision}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
