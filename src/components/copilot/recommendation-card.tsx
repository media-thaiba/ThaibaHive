"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface RecommendationCardProps {
  id: string;
  title: string;
  summary: string;
  domain: string;
  confidenceScore: number;
  humanApprovalStatus: string;
  createdAt: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function RecommendationCard({
  id,
  title,
  summary,
  domain,
  confidenceScore,
  humanApprovalStatus,
  createdAt,
  onApprove,
  onReject,
}: RecommendationCardProps) {
  const isAuto = humanApprovalStatus === "AUTO_EXECUTE";
  const badgeVariant = isAuto ? "success" : humanApprovalStatus === "APPROVED" ? "info" : "warning";

  return (
    <Card className="mb-4 border border-slate-700 bg-slate-900 text-slate-100 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Badge variant="secondary" className="mb-1 text-xs uppercase tracking-wider">
            {domain}
          </Badge>
          <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>
            {humanApprovalStatus}
          </Badge>
          <Badge variant="info">
            {(confidenceScore * 100).toFixed(0)}% Confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-300">{summary}</p>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Created: {new Date(createdAt).toLocaleTimeString()}</span>
          {humanApprovalStatus === "REQUIRES_HUMAN_APPROVAL" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500 hover:bg-emerald-950" onClick={() => onApprove?.(id)}>
                Approve & Execute
              </Button>
              <Button size="sm" variant="outline" className="text-rose-400 border-rose-500 hover:bg-rose-950" onClick={() => onReject?.(id)}>
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
