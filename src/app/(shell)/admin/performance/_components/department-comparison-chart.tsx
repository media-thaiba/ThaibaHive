"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function DepartmentComparisonChart() {
  const depts = [
    { name: "Computer Science", avg: 4.4, percentage: 88 },
    { name: "Mathematics", avg: 4.1, percentage: 82 },
    { name: "Administration", avg: 4.2, percentage: 84 },
    { name: "Humanities", avg: 4.0, percentage: 80 },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Department Score Comparisons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {depts.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span>{d.name}</span>
              <span>{d.avg} / 5.0</span>
            </div>
            <Progress value={d.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
