"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { TimetableEntryItem } from "./TimetableGrid";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
}

interface TeacherSubstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimetableEntryItem | null;
  teachers: Teacher[];
  onSuccess: () => void;
}

export function TeacherSubstitutionModal({
  open,
  onOpenChange,
  entry,
  teachers,
  onSuccess,
}: TeacherSubstitutionModalProps) {
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!substituteTeacherId) {
      setError("Please select a substitute teacher.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academic/timetables/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: entry.institutionId,
          timetableEntryId: entry.id,
          date,
          originalTeacherId: entry.teacherId || "unassigned",
          substituteTeacherId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign teacher substitution");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Teacher Substitution</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <div><span className="font-semibold">Subject:</span> {entry.subjectName}</div>
            <div><span className="font-semibold">Class:</span> {entry.className || "Assigned Class"}</div>
            <div><span className="font-semibold">Slot:</span> {entry.slotName} ({entry.slotStartTime} - {entry.slotEndTime})</div>
            <div>
              <span className="font-semibold">Regular Teacher:</span>{" "}
              {entry.teacherFirstName ? `${entry.teacherFirstName} ${entry.teacherLastName || ""}` : "Unassigned"}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Substitution Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Substitute Teacher</label>
            <Select
              value={substituteTeacherId}
              onChange={(e) => setSubstituteTeacherId(e.target.value)}
              required
            >
              <option value="">-- Select Teacher --</option>
              {teachers
                .filter((t) => t.id !== entry.teacherId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} {t.designation ? `(${t.designation})` : ""}
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Reason / Instructions (Optional)</label>
            <Textarea
              placeholder="e.g. Leave of absence, external seminar duty"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Confirm Substitution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
