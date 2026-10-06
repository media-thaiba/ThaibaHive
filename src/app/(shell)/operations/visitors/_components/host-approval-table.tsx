"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, UserCheck } from "lucide-react";

export function HostApprovalTable({
  requests,
  onApprove,
  onReject,
}: {
  requests: {
    id: string;
    visitorName: string;
    visitorPhone: string;
    purpose: string;
    expectedDate: string;
    status: string;
  }[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          No pending visitor pre-registration requests for approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{r.visitorName}</span>
                  <span className="text-xs text-muted-foreground">({r.visitorPhone})</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.purpose} • {r.expectedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {r.status === "pending" ? (
                <>
                  <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" onClick={() => onApprove(r.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => onReject(r.id)}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </>
              ) : (
                <Badge variant={r.status === "approved" ? "success" : "destructive"}>
                  {r.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
