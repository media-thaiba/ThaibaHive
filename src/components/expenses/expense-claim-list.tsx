"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DollarSign, ExternalLink, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

type ExpenseClaim = {
  id: string; staffId: string; amount: number; category: string; description: string;
  receiptUrl: string | null; status: string; reviewNotes: string | null;
  reviewedById: string | null; reviewedAt: string | null;
  createdAt: string; updatedAt: string; staffName?: string;
};

const statusConfig: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" | "info"; icon: React.ReactNode }> = {
  pending: { label: "Pending HOD", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  pending_hod: { label: "Pending HOD", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  pending_finance: { label: "Pending Finance", variant: "info", icon: <AlertTriangle className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

type Props = {
  claims: ExpenseClaim[];
  activeTab: "my" | "team";
  onReviewClaim: (claim: ExpenseClaim) => void;
};

export function ExpenseClaimList({ claims, activeTab, onReviewClaim }: Props) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{activeTab === "my" ? "Claim Ledger" : "Pending Team Claims"}</CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="h-12 w-12" />}
            title="No expense claims found"
            description={activeTab === "my" ? "Submit your bills and receipts to claim reimbursement." : "You're all caught up! No claims are waiting for review."}
          />
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => {
              const statusInfo = statusConfig[claim.status] || { label: claim.status, variant: "secondary", icon: <Clock className="h-3 w-3" /> };
              return (
                <div key={claim.id} className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">₹{claim.amount.toLocaleString("en-IN")}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{claim.category}</Badge>
                      <Badge variant={statusInfo.variant} className="gap-1 text-[10px] py-0">{statusInfo.icon} {statusInfo.label}</Badge>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{claim.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {activeTab === "team" && claim.staffName && <span>Submitted by: <strong>{claim.staffName}</strong></span>}
                      <span>Date: {formatDate(claim.createdAt)}</span>
                      {claim.receiptUrl && (
                        <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                          View Receipt <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {claim.reviewNotes && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs border border-border/40">
                        <span className="font-semibold text-muted-foreground">Reviewer Note: </span>
                        <span>{claim.reviewNotes}</span>
                      </div>
                    )}
                  </div>
                  {activeTab === "team" && ["pending", "pending_hod", "pending_finance"].includes(claim.status) && (
                    <div className="flex gap-2 self-end shrink-0 md:self-center">
                      <Button size="sm" onClick={() => onReviewClaim(claim)}>Review Claim</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
