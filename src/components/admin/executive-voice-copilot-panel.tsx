"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Sparkles } from "lucide-react";

export interface VoiceCopilotData {
  queriesToday: number;
  avgResponseMs: number;
  topIntents: Array<{ intent: string; count: number }>;
}

export function ExecutiveVoiceCopilotPanel({ data, loading }: { data?: VoiceCopilotData; loading?: boolean }) {
  if (loading || !data) {
    return (
      <Card role="region" aria-label="Executive Voice Copilot loading skeleton">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      role="region"
      aria-label={`Executive Voice Copilot: ${data.queriesToday} queries today, average response time ${data.avgResponseMs}ms`}
      tabIndex={0}
      className="border-border/60 bg-card hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Executive Voice Copilot</span>
        </CardTitle>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>NLP Active</span>
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{data.queriesToday}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Voice Queries Executed Today (Avg: {data.avgResponseMs}ms)</p>
        </div>

        <div className="space-y-1.5 text-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Top Domain Intents</span>
          {data.topIntents.slice(0, 2).map((item) => (
            <div key={item.intent} className="flex items-center justify-between bg-muted/40 p-2 rounded-md">
              <span className="font-mono text-[11px] text-foreground">{item.intent}</span>
              <span className="font-semibold text-muted-foreground">{item.count} queries</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
