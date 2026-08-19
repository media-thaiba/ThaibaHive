"use client";

import React from "react";
import { Card } from "@/components/ui/card";

interface ClassAnalyticsPanelProps {
  analytics: {
    totalStudents: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
    classAverage: number;
  };
}

export function ClassAnalyticsPanel({ analytics }: ClassAnalyticsPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="p-4 border shadow-sm">
        <div className="text-xs font-medium text-muted-foreground">Class Cohort Size</div>
        <div className="text-2xl font-bold mt-1 text-foreground">{analytics.totalStudents} Students</div>
      </Card>

      <Card className="p-4 border shadow-sm">
        <div className="text-xs font-medium text-muted-foreground">Passed Candidates</div>
        <div className="text-2xl font-bold mt-1 text-emerald-600">{analytics.passedCount}</div>
      </Card>

      <Card className="p-4 border shadow-sm">
        <div className="text-xs font-medium text-muted-foreground">Failed / Compartment</div>
        <div className="text-2xl font-bold mt-1 text-destructive">{analytics.failedCount}</div>
      </Card>

      <Card className="p-4 border shadow-sm">
        <div className="text-xs font-medium text-muted-foreground">Class Pass Rate</div>
        <div className="text-2xl font-bold mt-1 text-blue-600">{analytics.passRate}%</div>
      </Card>

      <Card className="p-4 border shadow-sm">
        <div className="text-xs font-medium text-muted-foreground">Average Score</div>
        <div className="text-2xl font-bold mt-1 text-purple-600">{analytics.classAverage}%</div>
      </Card>
    </div>
  );
}
