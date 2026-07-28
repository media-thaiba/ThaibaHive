"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

type PurchaseRequest = {
  id: string; requesterId: string; itemName: string; quantity: number; estimatedCost: number;
  justification: string | null; status: string; requesterName?: string;
  approvedByHodId: string | null; approvedByAccountsId: string | null;
  approvedByPurchaseId: string | null; notes: string | null;
  approvedAt: string | null; createdAt: string; updatedAt: string;
};

function getSteps(req: PurchaseRequest) {
  const isRejected = req.status === "rejected";
  return [
    { name: "Submission", status: "complete", desc: "Requested by staff" },
    {
      name: "HOD Approval",
      status: req.status === "pending_hod" ? "active" : (req.approvedByHodId || ["pending_accounts", "pending_purchase", "approved"].includes(req.status)) ? "complete" : isRejected && !req.approvedByHodId ? "failed" : "upcoming",
      desc: req.approvedByHodId ? "Approved" : isRejected && !req.approvedByHodId ? "Rejected" : "Pending",
    },
    {
      name: "Accounts clearance",
      status: req.status === "pending_accounts" ? "active" : (req.approvedByAccountsId || ["pending_purchase", "approved"].includes(req.status)) ? "complete" : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "failed" : "upcoming",
      desc: req.approvedByAccountsId ? "Approved" : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "Rejected" : "Pending",
    },
    {
      name: "Purchase Officer",
      status: req.status === "pending_purchase" ? "active" : req.status === "approved" ? "complete" : isRejected && req.approvedByAccountsId ? "failed" : "upcoming",
      desc: req.status === "approved" ? "Approved & Disbursed" : isRejected && req.approvedByAccountsId ? "Rejected" : "Pending",
    },
  ];
}

type Props = {
  purchases: PurchaseRequest[];
  allPurchases: PurchaseRequest[];
  activeTab: "my" | "team";
  canApprove: boolean;
  staffRole?: string;
  onSelect: (req: PurchaseRequest) => void;
  getStatusBadge: (status: string) => React.ReactNode;
};

export function PurchaseList({ purchases, allPurchases, activeTab, canApprove, staffRole, onSelect, getStatusBadge }: Props) {
  const checkUserCanReview = (req: PurchaseRequest): boolean => {
    if (!staffRole) return false;
    if (["super_admin", "admin"].includes(staffRole)) return true;
    if (req.status === "pending_hod" && staffRole === "hod") return true;
    if (req.status === "pending_accounts" && staffRole === "accounts") return true;
    if (req.status === "pending_purchase" && staffRole === "purchase") return true;
    return false;
  };

  const displayList = activeTab === "my" ? purchases : allPurchases;

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{activeTab === "my" ? "Personal Purchase Requests" : "Awaiting Approvals"}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayList.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-12 w-12" />}
            title="No purchase requests found"
            description={activeTab === "my" ? "Submit a new procurement request to start the approval pipeline." : "Excellent! You have no pending purchase requests to approve."}
          />
        ) : (
          <div className="space-y-4">
            {displayList.map((req) => (
              <div key={req.id} onClick={() => onSelect(req)} className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 cursor-pointer transition-colors md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{req.itemName}</span>
                    <span className="text-xs text-muted-foreground">&times; {req.quantity}</span>
                    {getStatusBadge(req.status)}
                  </div>
                  {req.justification && <p className="text-xs text-muted-foreground line-clamp-1">{req.justification}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {activeTab === "team" && req.requesterName && <span>Requester: <strong>{req.requesterName}</strong></span>}
                    <span>Estimated Cost: <strong>₹{(req.estimatedCost * req.quantity).toLocaleString("en-IN")}</strong></span>
                    <span>Created: {formatDate(req.createdAt)}</span>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    {getSteps(req).map((step, idx) => {
                      const isComplete = step.status === "complete";
                      const isActive = step.status === "active";
                      const isFailed = step.status === "failed";
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                          {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 border font-medium ${isComplete ? "bg-success/10 border-success/20 text-success" : isActive ? "bg-primary/10 border-primary/20 text-primary animate-pulse" : isFailed ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-muted-foreground"}`}>
                            {step.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                  {checkUserCanReview(req) && <Badge variant="info" className="text-[10px] animate-pulse">Requires Your Action</Badge>}
                  <Button variant="ghost" size="sm" className="text-xs">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
