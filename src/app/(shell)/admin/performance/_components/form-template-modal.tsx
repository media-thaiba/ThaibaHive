"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  frameworkId?: string;
}

export function FormTemplateModal({ open, onOpenChange, onSuccess, frameworkId = "default" }: FormTemplateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/performance/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkId,
          title,
          description,
          metricsConfigJson: JSON.stringify([{ metricId: "m1", ratingScale: "1-5" }]),
          ratingScale: "1-5",
        }),
      });
      if (res.ok) {
        onSuccess();
        onOpenChange(false);
        setTitle("");
        setDescription("");
      }
    } catch {
      // error handled in component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Evaluation Form Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Form Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Faculty Performance Form" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short instructions for evaluators" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
