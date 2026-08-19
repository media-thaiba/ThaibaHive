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

interface Framework {
  id: string;
  name: string;
  roleScope: string;
  metricsJson: string;
  isActive: boolean;
}

export function FrameworkBuilder() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [metricsText, setMetricsText] = useState(`[{"id":"m1","name":"Core Competencies","weight":50}]`);

  const fetchFrameworks = () => {
    setLoading(true);
    fetch("/api/admin/performance/frameworks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load competency frameworks");
        return res.json();
      })
      .then((data) => {
        setFrameworks(ensureArray(data.frameworks));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const handleCreateFramework = async () => {
    if (!name || !metricsText) return;
    try {
      const res = await fetch("/api/admin/performance/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          roleScope: "all",
          metricsJson: metricsText,
        }),
      });
      if (!res.ok) throw new Error("Creation failed");
      setOpenModal(false);
      setName("");
      fetchFrameworks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating framework");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Competency Framework Rubrics</CardTitle>
        <Button variant="outline" onClick={() => setOpenModal(true)}>+ Add Framework</Button>
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
          </div>
        ) : frameworks.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No competency frameworks configured.</p>
        ) : (
          <div className="space-y-3">
            {frameworks.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">{f.name}</h4>
                  <p className="text-xs text-muted-foreground">Scope: {f.roleScope}</p>
                </div>
                <Badge variant={f.isActive ? "success" : "secondary"}>
                  {f.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Competency Framework</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Framework Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teaching Staff Excellence Rubric" />
              </div>
              <div>
                <Label>Metrics Configuration (JSON)</Label>
                <Input value={metricsText} onChange={(e) => setMetricsText(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button onClick={handleCreateFramework}>Save Framework</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
