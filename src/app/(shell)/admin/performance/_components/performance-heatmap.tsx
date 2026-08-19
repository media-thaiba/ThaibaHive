"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PerformanceHeatmap() {
  const categories = [
    { name: "Curriculum & Teaching", score: 4.6, status: "EXCELLENT" },
    { name: "Research & Publication", score: 4.1, status: "GOOD" },
    { name: "Student Mentorship", score: 4.8, status: "EXCELLENT" },
    { name: "Administrative Duties", score: 3.9, status: "SATISFACTORY" },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Institutional Performance Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <span className="font-semibold text-sm">{c.name}</span>
              <p className="text-xs text-muted-foreground">Category Score: {c.score} / 5.0</p>
            </div>
            <Badge variant={c.score >= 4.5 ? "success" : c.score >= 4.0 ? "info" : "secondary"}>
              {c.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
