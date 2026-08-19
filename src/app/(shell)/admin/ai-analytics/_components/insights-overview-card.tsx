"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InsightsOverviewCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText: string;
  badgeVariant?: "success" | "warning" | "destructive" | "info" | "secondary";
}

export function InsightsOverviewCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = "info",
}: InsightsOverviewCardProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
