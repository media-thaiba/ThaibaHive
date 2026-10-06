"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface Goal {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
}

export function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([
    { id: "g1", title: "Complete Advanced Pedagogy Certification", targetDate: "2026-10-15", progress: 60 },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const handleAddGoal = () => {
    if (!newTitle || !newDate) return;
    const g: Goal = {
      id: `g_${Date.now()}`,
      title: newTitle,
      targetDate: newDate,
      progress: 0,
    };
    setGoals([...goals, g]);
    setNewTitle("");
    setNewDate("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Professional Development Goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">{g.title}</span>
                <span className="text-xs text-muted-foreground">Due: {g.targetDate}</span>
              </div>
              <Progress value={g.progress} className="h-2" />
              <p className="text-xs text-right text-muted-foreground">{g.progress}% Completed</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs font-semibold">Set New Goal</Label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Goal title..." />
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Button variant="outline" size="sm" onClick={handleAddGoal} className="w-full">Add Goal</Button>
        </div>
      </CardContent>
    </Card>
  );
}
