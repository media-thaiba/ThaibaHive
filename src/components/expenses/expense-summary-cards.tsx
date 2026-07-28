"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, Clock } from "lucide-react";

type Props = {
  total: number;
  approved: number;
  pending: number;
};

export function ExpenseSummaryCards({ total, approved, pending }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="hover:shadow-xs transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Submitted</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">₹{total.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across all submitted claims</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-xs transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reimbursed / Approved</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-success">₹{approved.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Reimbursements approved</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-xs transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approval</CardTitle>
          <Clock className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-warning">₹{pending.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Currently under HOD review</p>
        </CardContent>
      </Card>
    </div>
  );
}
