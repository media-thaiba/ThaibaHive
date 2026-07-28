"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Eye,
  CheckCircle2,
  Star,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { formatDate, ensureArray } from "@/lib/utils";

type Review = {
  id: string;
  staffId: string;
  reviewerId: string;
  period: string;
  rating: number | null;
  goals: string[] | null;
  achievements: string | null;
  areasForImprovement: string | null;
  managerComments: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  staffFirstName?: string;
  staffLastName?: string;
  staffEmployeeId?: string;
};

const statusStyles: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  submitted: "warning",
  completed: "success",
};

const statusLabels: Record<string, string> = {
  draft: "Self-Evaluation Pending",
  submitted: "Awaiting Manager Review",
  completed: "Completed",
};

function StarRating({ value, readonly = true }: { value: number; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= value ? "text-yellow-400" : "text-slate-300 dark:text-slate-600"}
          fill={star <= value ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export default function StaffReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Self-eval form
  const [achievements, setAchievements] = useState("");
  const [improvements, setImprovements] = useState("");
  const [selfSubmitting, setSelfSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data, ok } = await api.get<{ reviews: Review[] }>("/api/reviews", {
      toast: false,
    });
    if (ok && data) setReviews(ensureArray(data.reviews));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReviews().finally(() => setLoading(false));
  }, [fetchReviews]);

  const openDetail = async (review: Review) => {
    setSelectedReview(review);
    setDetailLoading(true);
    const { data, ok } = await api.get<{ review: Review }>(`/api/reviews/${review.id}`, {
      toast: false,
    });
    if (ok && data) {
      setSelectedReview(data.review);
      setAchievements(data.review.achievements || "");
      setImprovements(data.review.areasForImprovement || "");
    }
    setDetailLoading(false);
  };

  const handleSelfEval = async () => {
    if (!selectedReview) return;
    setSelfSubmitting(true);
    const { ok } = await api.patch(
      `/api/reviews/${selectedReview.id}`,
      {
        achievements: achievements || undefined,
        areasForImprovement: improvements || undefined,
        status: "submitted",
      },
      { errorMessage: "Failed to submit self-evaluation" }
    );
    if (ok) {
      toast.success("Self-evaluation submitted for manager review");
      setSelectedReview(null);
      fetchReviews();
    }
    setSelfSubmitting(false);
  };

  const handleSaveDraft = async () => {
    if (!selectedReview) return;
    setSelfSubmitting(true);
    const { ok } = await api.patch(
      `/api/reviews/${selectedReview.id}`,
      {
        achievements: achievements || undefined,
        areasForImprovement: improvements || undefined,
      },
      { errorMessage: "Failed to save draft" }
    );
    if (ok) {
      toast.success("Draft saved");
      fetchReviews();
    }
    setSelfSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="My Performance Reviews"
        description="View your quarterly reviews and submit self-evaluations."
      />

      <Card>
        <CardContent className="py-6">
          {reviews.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="No performance reviews yet"
              description="Your manager will create reviews for you during evaluation periods."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{review.period}</span>
                      <Badge
                        variant={statusStyles[review.status] || "secondary"}
                        className="text-[10px] py-0"
                      >
                        {statusLabels[review.status] || review.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created: {formatDate(review.createdAt)}</span>
                      {review.rating && (
                        <span className="flex items-center gap-1">
                          Rating: <StarRating value={review.rating} />
                        </span>
                      )}
                    </div>
                    {review.goals && review.goals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {review.goals.map((goal, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(review)}
                      className="gap-1 text-xs"
                    >
                      {review.status === "draft" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Self-Evaluate
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Detail / Self-Evaluation Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.status === "draft"
                ? "Self-Evaluation"
                : "Performance Review"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedReview ? (
            <div className="space-y-5">
              <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold">{selectedReview.period}</h3>
                    <p className="text-xs text-muted-foreground">
                      Reviewer: {selectedReview.reviewerId === selectedReview.staffId ? "Self" : "Manager"}
                    </p>
                  </div>
                  <Badge variant={statusStyles[selectedReview.status] || "secondary"}>
                    {statusLabels[selectedReview.status] || selectedReview.status}
                  </Badge>
                </div>
              </div>

              {/* Goals */}
              {selectedReview.goals && selectedReview.goals.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Goals for This Period
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedReview.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Self-Evaluation Form (only for draft reviews) */}
              {selectedReview.status === "draft" && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Self-Evaluation
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Achievements This Period</label>
                    <Textarea
                      placeholder="Describe your key accomplishments, completed goals, and contributions..."
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Areas for Improvement</label>
                    <Textarea
                      placeholder="Describe skills to develop, challenges faced, and areas where you'd like support..."
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Show existing self-eval for submitted/completed reviews */}
              {selectedReview.status !== "draft" &&
                (selectedReview.achievements || selectedReview.areasForImprovement) && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Self-Evaluation
                    </h4>
                    {selectedReview.achievements && (
                      <div className="rounded-lg border p-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Achievements
                        </span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {selectedReview.achievements}
                        </p>
                      </div>
                    )}
                    {selectedReview.areasForImprovement && (
                      <div className="rounded-lg border p-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Areas for Improvement
                        </span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {selectedReview.areasForImprovement}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Manager Feedback (for completed reviews) */}
              {selectedReview.status === "completed" && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Manager Feedback
                  </h4>
                  {selectedReview.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Rating:</span>
                      <StarRating value={selectedReview.rating} />
                      <span className="text-sm text-muted-foreground">
                        ({selectedReview.rating}/5)
                      </span>
                    </div>
                  )}
                  {selectedReview.managerComments && (
                    <div className="rounded-lg border p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReview.managerComments}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Completed on {formatDate(selectedReview.completedAt)}
                  </p>
                </div>
              )}

              {/* Actions for draft reviews */}
              {selectedReview.status === "draft" && (
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReview(null)}
                    disabled={selfSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={selfSubmitting}
                  >
                    Save Draft
                  </Button>
                  <Button onClick={handleSelfEval} disabled={selfSubmitting}>
                    Submit for Review
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
