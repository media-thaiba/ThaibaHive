"use client";

import React, { useState, useEffect } from "react";
import { TriggerRulesTable, TriggerRuleUI } from "@/components/triggers/trigger-rules-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AutomatedTriggersPage() {
  const [rules, setRules] = useState<TriggerRuleUI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/triggers/dispatch?tenantId=tenant-main")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load trigger rules");
        return res.json();
      })
      .then((data) => {
        const sampleRules: TriggerRuleUI[] = [
          {
            id: "rule-1",
            ruleName: "Chronic Absenteeism Parent Alert",
            eventType: "absenteeism",
            actionChannel: "sms",
            recipientGroup: "parents",
            priority: "urgent",
            isActive: true,
            triggerCount: data.logsCount || 14,
          },
          {
            id: "rule-2",
            ruleName: "Fee Overdue Default Notice",
            eventType: "fee_default",
            actionChannel: "push",
            recipientGroup: "parents",
            priority: "high",
            isActive: true,
            triggerCount: 8,
          },
          {
            id: "rule-3",
            ruleName: "Academic Grade Drop Risk Warning",
            eventType: "grade_drop",
            actionChannel: "push",
            recipientGroup: "staff",
            priority: "normal",
            isActive: false,
            triggerCount: 3,
          },
        ];
        setRules(sampleRules);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load trigger data");
        setLoading(false);
      });
  }, []);

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleCreateRule = () => {
    if (!newRuleName.trim()) return;
    const newRule: TriggerRuleUI = {
      id: `rule-${Date.now()}`,
      ruleName: newRuleName,
      eventType: "absenteeism",
      actionChannel: "sms",
      recipientGroup: "parents",
      priority: "high",
      isActive: true,
      triggerCount: 0,
    };
    setRules((prev) => [newRule, ...prev]);
    setNewRuleName("");
    setIsDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automated Trigger Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure event-driven intervention rules, SMS/Push notification actions, and dispatch rate limits.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Create Trigger Rule</Button>
      </div>

      {error && (
        <Alert variant="error">
          <div>
            <div className="font-semibold">Error Loading Triggers</div>
            <div>{error}</div>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Rule Directory</CardTitle>
            <p className="text-sm text-muted-foreground">
              Event-driven rules automatically evaluated against student attendance and financial anomalies.
            </p>
          </CardHeader>
          <CardContent>
            <TriggerRulesTable
              rules={rules}
              onToggleRule={handleToggleRule}
              onEditRule={(rule) => alert(`Editing ${rule.ruleName}`)}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trigger Rule</DialogTitle>
            <DialogDescription>
              Define a new automated trigger rule for absenteeism or fee defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                placeholder="e.g. High Risk Absenteeism SMS Notice"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
