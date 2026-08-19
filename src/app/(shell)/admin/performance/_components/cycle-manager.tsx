"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureArray } from "@/lib/utils";

interface Cycle {
  id: string;
  title: string;
  cycleType: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline: string;
  managerReviewDeadline: string;
  status: string;
}

export function CycleManager() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selfDeadline, setSelfDeadline] = useState("");
  const [managerDeadline, setManagerDeadline] = useState("");

  const fetchCycles = () => {
    setLoading(true);
    fetch("/api/admin/performance/cycles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load review cycles");
        return res.json();
      })
      .then((data) => {
        setCycles(ensureArray(data.cycles));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleCreateCycle = async () => {
    if (!title || !startDate || !endDate) return;
    try {
      const res = await fetch("/api/admin/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          cycleType: "quarterly",
          startDate,
          endDate,
          selfAssessmentDeadline: selfDeadline || startDate,
          managerReviewDeadline: managerDeadline || endDate,
        }),
      });
      if (!res.ok) throw new Error("Creation failed");
      setOpenModal(false);
      setTitle("");
      fetchCycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating cycle");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Performance Review Cycles</CardTitle>
        <Button onClick={() => setOpenModal(true)}>+ New Review Cycle</Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}


        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : cycles.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No active performance review cycles found.</p>
        ) : (
          <div className="space-y-3">
            {cycles.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">{c.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Duration: {c.startDate} to {c.endDate}
                  </p>
                </div>
                <Badge variant={c.status === "active" ? "success" : "secondary"}>
                  {c.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Launch Performance Review Cycle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Cycle Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 Q3 Staff Appraisal" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Self Assessment Due</Label>
                  <Input type="date" value={selfDeadline} onChange={(e) => setSelfDeadline(e.target.value)} />
                </div>
                <div>
                  <Label>Manager Review Due</Label>
                  <Input type="date" value={managerDeadline} onChange={(e) => setManagerDeadline(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button onClick={handleCreateCycle}>Launch Cycle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
