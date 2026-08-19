"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

interface SelfAssessmentFormProps {
  reviewId?: string;
  onSuccess?: () => void;
}

export function SelfAssessmentForm({ reviewId, onSuccess }: SelfAssessmentFormProps) {
  const [q1Score, setQ1Score] = useState(4);
  const [q2Score, setQ2Score] = useState(4);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reviewId) {
      setMessage("No active review cycle found for self-assessment.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "self_assessment",
          ratings: [
            { metricId: "m1", score: Number(q1Score), comments: "Self evaluation on core duties" },
            { metricId: "m2", score: Number(q2Score), comments: "Self evaluation on teamwork" },
          ],
          overallComments: comments,
        }),
      });
      if (res.ok) {
        setMessage("Self-assessment submitted successfully!");
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json();
        setMessage(data.error || "Submission failed");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error submitting self-assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quarterly Self-Assessment Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <Alert variant="info">{message}</Alert>}

        <div>
          <Label>Core Job Execution & Quality (1 - 5 Scale)</Label>
          <Input type="number" min="1" max="5" value={q1Score} onChange={(e) => setQ1Score(Number(e.target.value))} />
        </div>

        <div>
          <Label>Collaboration & Institutional Contribution (1 - 5 Scale)</Label>
          <Input type="number" min="1" max="5" value={q2Score} onChange={(e) => setQ2Score(Number(e.target.value))} />
        </div>

        <div>
          <Label>Self Reflection & Accomplishments</Label>
          <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Summarize your key achievements this quarter..." />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Self-Assessment"}
        </Button>
      </CardContent>
    </Card>
  );
}
