"use client";

import React from "react";
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
import { Select, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { CATEGORIES } from "./grievance-list";

export type GrievanceSubmitForm = {
  isAnonymous: boolean;
  category: string;
  subject: string;
  description: string;
};

interface GrievanceSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: GrievanceSubmitForm;
  setForm: React.Dispatch<React.SetStateAction<GrievanceSubmitForm>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function GrievanceSubmitDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  submitting,
}: GrievanceSubmitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Grievance / Feedback</DialogTitle>
          <DialogDescription>
            Your submission will be treated confidentially. You may choose to submit anonymously.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Anonymous Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <input
              type="checkbox"
              id="anonymous-toggle"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="anonymous-toggle" className="cursor-pointer">
              Submit Anonymously
            </Label>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              placeholder="Brief summary of your concern"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe your grievance or feedback in detail..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : <><Send className="h-4 w-4 mr-1.5" /> Submit</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
