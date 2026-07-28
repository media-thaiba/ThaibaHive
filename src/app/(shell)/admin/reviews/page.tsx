"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  Star,
  Eye,
  CheckCircle2,
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

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
};

const statusStyles: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  submitted: "warning",
  completed: "success",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting Review",
  completed: "Completed",
};

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-lg transition-colors ${
            star <= (hover || value)
              ? "text-yellow-400"
              : "text-slate-300 dark:text-slate-600"
          } ${readonly ? "cursor-default" : "cursor-pointer hover:text-yellow-400"}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            size={20}
            fill={star <= (hover || value) ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { staff } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form state
  const [newStaffId, setNewStaffId] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newGoals, setNewGoals] = useState("");

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data, ok } = await api.get<{ reviews: Review[] }>("/api/reviews", {
      toast: false,
    });
    if (ok && data) setReviews(ensureArray(data.reviews));
  }, []);

  const fetchStaff = useCallback(async () => {
    const { data, ok } = await api.get<{ staff: StaffOption[] }>("/api/staff", {
      toast: false,
    });
    if (ok && data) setStaffList(ensureArray(data.staff));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchReviews(), fetchStaff()])
      .finally(() => setLoading(false));
  }, [fetchReviews, fetchStaff]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffId || !newPeriod) {
      toast.error("Staff member and period are required");
      return;
    }
    const goals = newGoals.split("\n").filter((g) => g.trim());
    const { ok } = await api.post(
      "/api/reviews",
      { staffId: newStaffId, period: newPeriod, goals: goals.length > 0 ? goals : undefined },
      { errorMessage: "Failed to create review" }
    );
    if (ok) {
      toast.success("Performance review created");
      setShowCreate(false);
      setNewStaffId("");
      setNewPeriod("");
      setNewGoals("");
      fetchReviews();
    }
  };

  const openDetail = async (review: Review) => {
    setSelectedReview(review);
    setDetailLoading(true);
    const { data, ok } = await api.get<{ review: Review }>(`/api/reviews/${review.id}`, {
      toast: false,
    });
    if (ok && data) {
      setSelectedReview(data.review);
      setReviewRating(data.review.rating || 0);
      setReviewComments(data.review.managerComments || "");
    }
    setDetailLoading(false);
  };

  const handleSubmitReview = async (status: "submitted" | "completed") => {
    if (!selectedReview) return;
    if (status === "completed" && reviewRating === 0) {
      toast.error("Please provide a rating before completing the review");
      return;
    }
    setReviewSubmitting(true);
    const { ok } = await api.patch(
      `/api/reviews/${selectedReview.id}`,
      {
        rating: reviewRating || undefined,
        managerComments: reviewComments || undefined,
        status,
      },
      { errorMessage: "Failed to update review" }
    );
    if (ok) {
      toast.success(status === "completed" ? "Review completed" : "Review updated");
      setSelectedReview(null);
      fetchReviews();
    }
    setReviewSubmitting(false);
  };

  const myReviews = reviews.filter((r) => r.reviewerId === staff?.id);
  const displayReviews = ["super_admin", "admin"].includes(staff?.role || "")
    ? reviews
    : myReviews;

  const pendingCount = displayReviews.filter((r) => r.status === "submitted").length;

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Performance Reviews"
        description={`${pendingCount} review${pendingCount !== 1 ? "s" : ""} awaiting your feedback`}
        actions={
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Review
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {["super_admin", "admin"].includes(staff?.role || "")
              ? "All Reviews"
              : "My Review Assignments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayReviews.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="No performance reviews"
              description="Create a quarterly review to start tracking staff performance."
              action={{ label: "New Review", onClick: () => setShowCreate(true) }}
            />
          ) : (
            <div className="space-y-3">
              {displayReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {review.staffFirstName} {review.staffLastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({review.staffEmployeeId})
                      </span>
                      <Badge
                        variant={statusStyles[review.status] || "secondary"}
                        className="text-[10px] py-0"
                      >
                        {statusLabels[review.status] || review.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Period: {review.period}</span>
                      <span>Created: {formatDate(review.createdAt)}</span>
                      {review.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star size={12} className="text-yellow-400" fill="currentColor" />
                          {review.rating}/5
                        </span>
                      )}
                    </div>
                    {review.goals && review.goals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {review.goals.slice(0, 3).map((goal, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {goal}
                          </Badge>
                        ))}
                        {review.goals.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{review.goals.length - 3} more
                          </Badge>
                        )}
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
                      <Eye className="h-3.5 w-3.5" />
                      {review.status === "submitted" ? "Review" : "View"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Review Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Performance Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Staff Member
              </label>
              <Select value={newStaffId} onChange={(e) => setNewStaffId(e.target.value)} required>
                <option value="">Select staff...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.employeeId})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Review Period
              </label>
              <Input
                placeholder="e.g. Q1 2026, H1 2026"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Goals (one per line)
              </label>
              <Textarea
                placeholder="Improve classroom engagement&#10;Complete certification&#10;Mentor 2 junior staff"
                value={newGoals}
                onChange={(e) => setNewGoals(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Review</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performance Review</DialogTitle>
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
                    <h3 className="text-sm font-bold">
                      {selectedReview.staffFirstName} {selectedReview.staffLastName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedReview.staffEmployeeId} • {selectedReview.period}
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
                    Goals
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

              {/* Self-Evaluation */}
              {(selectedReview.achievements || selectedReview.areasForImprovement) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Self-Evaluation
                  </h4>
                  {selectedReview.achievements && (
                    <div className="rounded-lg border p-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Achievements
                      </span>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedReview.achievements}</p>
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

              {/* Manager Review */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Manager Review
                </h4>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Rating</label>
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Comments</label>
                  <Textarea
                    placeholder="Provide feedback on performance..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReview(null)}
                  disabled={reviewSubmitting}
                >
                  Cancel
                </Button>
                {selectedReview.status === "submitted" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSubmitReview("submitted")}
                      disabled={reviewSubmitting}
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => handleSubmitReview("completed")}
                      disabled={reviewSubmitting}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 size={16} className="mr-1" />
                      Complete Review
                    </Button>
                  </>
                )}
                {selectedReview.status === "draft" && (
                  <Button
                    onClick={() => handleSubmitReview("completed")}
                    disabled={reviewSubmitting}
                  >
                    Complete Review
                  </Button>
                )}
              </div>

              {selectedReview.completedAt && (
                <p className="text-xs text-muted-foreground text-right">
                  Completed on {formatDate(selectedReview.completedAt)}
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
