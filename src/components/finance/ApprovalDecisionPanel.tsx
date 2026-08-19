"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface ApprovalDecisionPanelProps {
  action: "approve" | "reject" | "return";
  onActionChange: (action: "approve" | "reject" | "return") => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function ApprovalDecisionPanel({
  action,
  onActionChange,
  notes,
  onNotesChange,
  isSubmitting,
  onSubmit,
}: ApprovalDecisionPanelProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Select Decision Action</label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={action === "approve" ? "default" : "outline"}
            size="sm"
            onClick={() => onActionChange("approve")}
            className="flex items-center gap-1 justify-center"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Approve
          </Button>

          <Button
            type="button"
            variant={action === "reject" ? "destructive" : "outline"}
            size="sm"
            onClick={() => onActionChange("reject")}
            className="flex items-center gap-1 justify-center"
          >
            <XCircle className="w-4 h-4" /> Reject
          </Button>

          <Button
            type="button"
            variant={action === "return" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onActionChange("return")}
            className="flex items-center gap-1 justify-center"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" /> Return
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">
          Decision Notes {action === "reject" ? "(Required)" : "(Optional)"}
        </label>
        <Textarea
          placeholder={
            action === "reject"
              ? "Specify mandatory reason for rejection..."
              : "Add review comments or instructions..."
          }
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="button"
        variant={action === "reject" ? "destructive" : "default"}
        className="w-full"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : `Confirm ${action.toUpperCase()}`}
      </Button>
    </div>
  );
}
