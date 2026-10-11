"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import type { AgentPlugin } from "./types";

type ApprovalDialogProps = {
  plugin: AgentPlugin | null;
  action: "approve" | "reject" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (plugin: AgentPlugin, action: "approve" | "reject", reason: string) => Promise<void>;
};

export function ApprovalDialog({ plugin, action, open, onOpenChange, onSubmit }: ApprovalDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!plugin || !action) return null;

  const isApprove = action === "approve";

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(isApprove ? "An approval note is required for the audit trail." : "A rejection reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(plugin, action, reason.trim());
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve" : "Reject"} {plugin.displayName}
          </DialogTitle>
          <DialogDescription>
            {plugin.pluginKey}@{plugin.version} · manifest hash {plugin.manifestHash.slice(0, 12)}
            {isApprove
              ? " — approving makes this plugin installable across institutions that can see it. Global-scope plugins require super_admin."
              : " — rejecting keeps the plugin visible to its author but blocks installation until it is resubmitted."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="approval-reason">{isApprove ? "Approval note" : "Rejection reason"}</Label>
          <Textarea
            id="approval-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={512}
            placeholder={isApprove ? "Reviewed manifest, budget and egress — safe to install." : "Over-broad egress URLs in the manifest."}
            aria-describedby="approval-reason-help"
          />
          <p id="approval-reason-help" className="text-[11px] text-muted-foreground">
            {reason.length}/512 · written to the Merkle audit ledger.
          </p>
        </div>

        {error && (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isApprove ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : isApprove ? "Approve plugin" : "Reject plugin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
