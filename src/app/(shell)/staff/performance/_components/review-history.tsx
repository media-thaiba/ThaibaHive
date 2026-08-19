"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ReviewHistory() {
  const history = [
    { id: "r1", period: "2026 Q2 Appraisal", score: 4.5, grade: "A+", status: "signed_off" },
    { id: "r2", period: "2026 Q1 Appraisal", score: 4.2, grade: "A", status: "signed_off" },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historical Appraisal Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-semibold text-sm">{h.period}</h4>
              <p className="text-xs text-muted-foreground">Final Score: {h.score} / 5.0</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Grade {h.grade}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
