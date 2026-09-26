"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2, ShieldCheck, DollarSign, TrendingUp } from "lucide-react";

interface SupplyKpiProps {
  totalOrders: number;
  totalSpendUsd: number;
  encumberedUsd: number;
  matchedRatePercent: number;
  averageRiskScore: number;
  esgRatingSummary: string;
}

export function SupplyCockpitKpiCards({
  totalOrders,
  totalSpendUsd,
  encumberedUsd,
  matchedRatePercent,
  averageRiskScore,
  esgRatingSummary,
}: SupplyKpiProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend & Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalSpendUsd.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="font-semibold text-foreground">{totalOrders}</span> purchase orders issued
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Budget Encumbrance</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${encumberedUsd.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pre-Committed</Badge>
            Double-entry GL locked
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">3-Way Match Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{matchedRatePercent}%</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" /> Automated voucher release
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Supply Risk & ESG</CardTitle>
          <ShieldCheck className="h-4 w-4 text-cyan-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{averageRiskScore}</span>
            <Badge variant="outline" className="font-semibold text-emerald-600 bg-emerald-500/10">
              ESG {esgRatingSummary}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Sanctions screened: 100% clean
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
