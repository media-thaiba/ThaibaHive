"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardsProps {
  metrics: {
    totalExams: number;
    scheduledCount: number;
    hallTicketsIssued: number;
    pendingEvaluations: number;
    passRate: number;
  };
  isLoading?: boolean;
}

export function ExamStatCards({ metrics, isLoading }: StatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Examinations", value: metrics.totalExams, color: "text-blue-600" },
    { label: "Scheduled Sessions", value: metrics.scheduledCount, color: "text-amber-600" },
    { label: "Hall Tickets Issued", value: metrics.hallTicketsIssued, color: "text-emerald-600" },
    { label: "Pending Evaluations", value: metrics.pendingEvaluations, color: "text-purple-600" },
    { label: "Overall Pass Rate", value: `${metrics.passRate.toFixed(1)}%`, color: "text-teal-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item, idx) => (
        <Card key={idx} className="p-4 border shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
          <div className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</div>
        </Card>
      ))}
    </div>
  );
}
