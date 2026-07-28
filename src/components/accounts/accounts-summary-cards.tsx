"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";

type Props = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export function AccountsSummaryCards({ totalIncome, totalExpense, netBalance }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="hover:shadow-xs transition-shadow border-l-4 border-l-success">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue / Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-success">₹{totalIncome.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sum of institutional receipts</p>
        </CardContent>
      </Card>
      <Card className="hover:shadow-xs transition-shadow border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Operational Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-destructive">₹{totalExpense.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sum of institutional disbursements</p>
        </CardContent>
      </Card>
      <Card className={`hover:shadow-xs transition-shadow border-l-4 ${netBalance >= 0 ? "border-l-primary" : "border-l-warning"}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Balance</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${netBalance >= 0 ? "text-primary" : "text-warning"}`}>₹{netBalance.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Net operating margin surplus</p>
        </CardContent>
      </Card>
    </div>
  );
}
