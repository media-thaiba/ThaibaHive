"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  Grievance,
  CATEGORY_VARIANT,
  CATEGORY_LABELS,
  STATUS_VARIANT,
  STATUS_LABELS,
} from "./grievance-list";

interface GrievanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Grievance | null;
  isAdmin: boolean;
  responseForm: { status: string; response: string };
  setResponseForm: React.Dispatch<React.SetStateAction<{ status: string; response: string }>>;
  onSubmitResponse: (e: React.FormEvent) => void;
  responding: boolean;
}

export function GrievanceDetailDialog({
  open,
  onOpenChange,
  selected,
  isAdmin,
  responseForm,
  setResponseForm,
  onSubmitResponse,
  responding,
}: GrievanceDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grievance Details</DialogTitle>
          <DialogDescription>
            {selected?.isAnonymous
              ? "This submission is anonymous."
              : `Submitted by ${selected?.submitterName || "Staff Member"}`}
          </DialogDescription>
        </DialogHeader>

        {selected && (
          <div className="space-y-4">
            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={CATEGORY_VARIANT[selected.category] || "default"}>
                  {CATEGORY_LABELS[selected.category] || selected.category}
                </Badge>
                <Badge variant={STATUS_VARIANT[selected.status] || "secondary"}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(selected.createdAt)}
                </span>
              </div>
              <h3 className="font-semibold">{selected.subject}</h3>
              <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </div>
            </div>

            {/* Existing Response */}
            {selected.response && (
              <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-1">
                <p className="text-xs font-semibold text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Committee Response
                </p>
                <p className="text-sm">{selected.response}</p>
                {selected.respondedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(selected.respondedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
              <form
                onSubmit={onSubmitResponse}
                className="space-y-3 p-3 rounded-lg bg-muted/20 border"
              >
                <p className="text-xs font-semibold flex items-center gap-1 text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Admin Committee Response
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs">Update Status</Label>
                  <Select
                    value={responseForm.status}
                    onChange={(e) =>
                      setResponseForm({ ...responseForm, status: e.target.value })
                    }
                  >
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Official Response Notes</Label>
                  <Textarea
                    placeholder="Enter the committee's official response..."
                    value={responseForm.response}
                    onChange={(e) =>
                      setResponseForm({ ...responseForm, response: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={responding} className="w-full">
                  {responding ? "Submitting..." : <><Send className="h-4 w-4 mr-1.5" /> Submit Response</>}
                </Button>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
