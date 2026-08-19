"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DevelopmentPlanEditor() {
  const [plans, setPlans] = useState<string[]>([
    "Attend Workshop on Advanced Curriculum Design & Assessment",
  ]);
  const [newPlan, setNewPlan] = useState("");

  const handleAddPlan = () => {
    if (!newPlan) return;
    setPlans([...plans, newPlan]);
    setNewPlan("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Professional Development Action Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {plans.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs">Add Action Plan Item</Label>
          <Input value={newPlan} onChange={(e) => setNewPlan(e.target.value)} placeholder="Training recommendation..." />
          <Button variant="outline" size="sm" onClick={handleAddPlan} className="w-full">Add Action Item</Button>
        </div>
      </CardContent>
    </Card>
  );
}
