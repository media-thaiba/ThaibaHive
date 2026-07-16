"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type AccessRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
};

export function AccessRequestDialog({
  open,
  onOpenChange,
  appName,
  onSubmit,
  isSubmitting,
}: AccessRequestDialogProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onSubmit(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Access to {appName}</DialogTitle>
          <DialogDescription>
            Your request will be sent to the department head for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for access</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you need access to this application..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
