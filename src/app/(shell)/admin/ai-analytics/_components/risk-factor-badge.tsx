"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface RiskFactorBadgeProps {
  riskLevel: "low" | "medium" | "high" | "critical";
  label?: string;
}

export function RiskFactorBadge({ riskLevel, label }: RiskFactorBadgeProps) {
  const variantMap: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
    low: "success",
    medium: "info",
    high: "warning",
    critical: "destructive",
  };

  return (
    <Badge variant={variantMap[riskLevel] || "info"}>
      {label || riskLevel.toUpperCase()}
    </Badge>
  );
}
