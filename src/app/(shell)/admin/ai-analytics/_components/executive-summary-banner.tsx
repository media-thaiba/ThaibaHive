"use client";

import React from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ExecutiveSummaryBannerProps {
  summary: string;
  generatedAt: string;
  recommendedActions: string[];
}

export function ExecutiveSummaryBanner({
  summary,
  generatedAt,
  recommendedActions,
}: ExecutiveSummaryBannerProps) {
  return (
    <Alert variant="info" className="bg-primary/5 border-primary/20 p-4 rounded-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-primary flex items-center gap-2">
            🤖 AI Executive Intelligence Briefing
          </span>
          <Badge variant="secondary" className="text-xs">
            {new Date(generatedAt).toLocaleDateString()}
          </Badge>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        {recommendedActions && recommendedActions.length > 0 && (
          <div className="pt-2 border-t border-primary/10">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Recommended Administrative Actions:
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              {recommendedActions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Alert>
  );
}

