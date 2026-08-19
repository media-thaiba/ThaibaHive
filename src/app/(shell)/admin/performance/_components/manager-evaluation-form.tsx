"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface ManagerEvaluationFormProps {
  reviewId?: string;
  staffName?: string;
  selfScore?: number;
  onSuccess?: () => void;
}

export function ManagerEvaluationForm({
  reviewId = "rev_demo",
  staffName = "Dr. Sarah Ahmed",
  selfScore = 4.5,
  onSuccess,
}: ManagerEvaluationFormProps) {
  const [managerScore, setManagerScore] = useState(4);
  const [grade, setGrade] = useState("A");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "manager_review",
          ratings: [{ metricId: "m1", score: Number(managerScore), comments: "Manager evaluation rating" }],
          overallComments: comments,
          recommendedGrade: grade,
        }),
      });
      if (res.ok) {
        setMessage("Evaluation submitted successfully to HR approval queue!");
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json();
        setMessage(data.error || "Submission failed");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error submitting evaluation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Manager Evaluation Workspace: {staffName}</CardTitle>
          <Badge variant="info">Self Score: {selfScore} / 5.0</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <Alert variant="info">{message}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Manager Rating (1 - 5 Scale)</Label>
            <Input type="number" min="1" max="5" value={managerScore} onChange={(e) => setManagerScore(Number(e.target.value))} />
          </div>
          <div>
            <Label>Recommended Grade</Label>
            <Input value={grade} onChange={(e) => setGrade(e.target.value.toUpperCase())} placeholder="A+, A, B, C, D" />
          </div>
        </div>

        <div>
          <Label>Evaluator Feedback & Justification</Label>
          <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Provide constructive feedback for staff member..." />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Manager Rating & Send to HR"}
        </Button>
      </CardContent>
    </Card>
  );
}
