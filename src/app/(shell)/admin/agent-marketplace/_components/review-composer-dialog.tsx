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
import { Select, SelectItem } from "@/components/ui/select";
import type { AgentPlugin } from "./types";

type ReviewComposerDialogProps = {
  plugin: AgentPlugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (plugin: AgentPlugin, rating: number, reviewText: string) => Promise<void>;
};

export function ReviewComposerDialog({ plugin, open, onOpenChange, onSubmit }: ReviewComposerDialogProps) {
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating("5");
      setReviewText("");
      setError(null);
    }
  }, [open]);

  if (!plugin) return null;

  const handleSubmit = async () => {
    const parsed = Number(rating);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      setError("Rating must be a whole number between 1 and 5.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(plugin, parsed, reviewText.trim());
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {plugin.displayName}</DialogTitle>
          <DialogDescription>
            One review per institution and reviewer. Submitting again updates your existing rating and re-rolls the
            plugin average.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="review-rating">Rating</Label>
          <Select id="review-rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            <SelectItem value="5">5 — Excellent</SelectItem>
            <SelectItem value="4">4 — Good</SelectItem>
            <SelectItem value="3">3 — Adequate</SelectItem>
            <SelectItem value="2">2 — Poor</SelectItem>
            <SelectItem value="1">1 — Unusable</SelectItem>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-text">Comments (optional)</Label>
          <Textarea
            id="review-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            maxLength={1024}
            placeholder="What worked, what did not, and where you deployed it."
          />
          <p className="text-[11px] text-muted-foreground">{reviewText.length}/1024</p>
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
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
