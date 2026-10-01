"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Eye, CheckCircle, Lock } from "lucide-react";

interface GrievanceStatCardsProps {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  anonymousCount: number;
}

export function GrievanceStatCards({
  totalCount,
  openCount,
  resolvedCount,
  anonymousCount,
}: GrievanceStatCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Total Submissions</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-warning/10 p-2.5">
            <Eye className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground">Open &amp; In Review</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-success/10 p-2.5">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Resolved Concerns</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-info/10 p-2.5">
            <Lock className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold">{anonymousCount}</p>
            <p className="text-xs text-muted-foreground">Anonymous Submissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
