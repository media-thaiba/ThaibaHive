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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Select, SelectItem } from "@/components/ui/select";
import { liveSessionStartSchema } from "@/lib/validation/schemas";
import type { LiveSession } from "./types";

type StartSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (session: LiveSession) => void;
};

const EMPTY_FORM = {
  sessionType: "cctv_analysis",
  cameraZoneId: "",
  modelId: "gemini-3.8-live",
  keyframeIntervalSeconds: "1",
  maxDurationSeconds: "900",
  systemInstruction: "",
};

export function StartSessionDialog({ open, onOpenChange, onStarted }: StartSessionDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM });
      setErrors([]);
    }
  }, [open]);

  const update = (key: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors([]);

    const payload = {
      sessionType: form.sessionType,
      cameraZoneId: form.cameraZoneId.trim() || undefined,
      modelId: form.modelId.trim(),
      keyframeIntervalSeconds: Number(form.keyframeIntervalSeconds),
      maxDurationSeconds: Number(form.maxDurationSeconds),
      systemInstruction: form.systemInstruction.trim() || undefined,
    };

    const parsed = liveSessionStartSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors([data.error || "Failed to start session"]);
        return;
      }
      onStarted(data.session);
      onOpenChange(false);
    } catch {
      setErrors(["Network error while starting the session"]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start live session</DialogTitle>
          <DialogDescription>
            Opens a duplex multimodal stream. Institutions are capped at 3 concurrent sessions and 120 session-minutes
            per day; exceeding either returns 429.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ls-type">Session type</Label>
            <Select id="ls-type" value={form.sessionType} onChange={update("sessionType")}>
              <SelectItem value="cctv_analysis">CCTV analysis</SelectItem>
              <SelectItem value="operator_console">Operator console</SelectItem>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls-model">Model</Label>
            <Input id="ls-model" value={form.modelId} onChange={update("modelId")} maxLength={64} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls-zone">Camera zone ID</Label>
            <Input id="ls-zone" value={form.cameraZoneId} onChange={update("cameraZoneId")} maxLength={64} placeholder="zone-gate-north" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls-kf">Keyframe interval (s)</Label>
            <Input id="ls-kf" type="number" min={1} max={10} value={form.keyframeIntervalSeconds} onChange={update("keyframeIntervalSeconds")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls-max">Max duration (s)</Label>
            <Input id="ls-max" type="number" min={30} max={3600} value={form.maxDurationSeconds} onChange={update("maxDurationSeconds")} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="ls-si">System instruction</Label>
            <Textarea id="ls-si" value={form.systemInstruction} onChange={update("systemInstruction")} maxLength={2048} className="min-h-[60px]" />
          </div>
        </div>

        {errors.length > 0 && (
          <Alert variant="error" role="alert">
            <ul className="list-disc pl-5 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-xs">
                  {e}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Starting…" : "Start session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
