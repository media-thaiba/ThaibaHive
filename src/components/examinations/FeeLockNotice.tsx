"use client";

import React, { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeeLockNoticeProps {
  pendingAmount: number;
  onOverrideRequest?: (reason: string) => void;
}

export function FeeLockNotice({ pendingAmount, onOverrideRequest }: FeeLockNoticeProps) {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const handleApplyOverride = () => {
    if (!overrideReason.trim()) {
      alert("Please provide an administrative reason for fee lock override.");
      return;
    }
    if (onOverrideRequest) {
      onOverrideRequest(overrideReason);
    }
  };

  return (
    <Alert variant="error" className="my-4">
      <div className="font-bold flex items-center justify-between">
        <span>Hall Ticket Generation Blocked (Pending Dues)</span>
        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-mono">
          Balance: ${pendingAmount.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 space-y-3">
        <p className="text-xs">
          Student has outstanding financial dues. Per institutional policy, hall tickets are locked until full fee clearance or authorized administrative override.
        </p>

        {!showOverrideInput ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowOverrideInput(true)}>
              Administrative Override (Fee Lock)
            </Button>
          </div>
        ) : (
          <div className="space-y-2 border-t pt-2 border-destructive/20">
            <label className="text-xs font-semibold">Override Audit Reason</label>
            <Input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Special permission granted by Principal for Term 2"
              className="bg-background text-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApplyOverride}>
                Confirm Override & Issue Ticket
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowOverrideInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Alert>
  );
}
