"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AtRiskRecord } from "./at-risk-table";

interface InterventionModalProps {
  record: AtRiskRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (interventionData: { counselorName: string; actionPlan: string }) => void;
}

export function InterventionModal({
  record,
  isOpen,
  onClose,
  onSave,
}: InterventionModalProps) {
  const [counselorName, setCounselorName] = useState("");
  const [actionPlan, setActionPlan] = useState("");

  if (!record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ counselorName, actionPlan });
    setCounselorName("");
    setActionPlan("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Intervention Plan</DialogTitle>
          <DialogDescription>
            Assign counselor & define action items for {record.studentName || record.studentId} ({record.domain} risk).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="counselor">Assigned Counselor / Staff</Label>
            <Input
              id="counselor"
              placeholder="e.g. Dr. Ahmed Khan"
              value={counselorName}
              onChange={(e) => setCounselorName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan">Intervention Action Plan</Label>
            <Textarea
              id="plan"
              placeholder="Describe parental outreach, academic tutoring, or fee payment arrangements..."
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              rows={3}
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Action Plan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
