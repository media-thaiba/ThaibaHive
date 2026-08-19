"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TriggerRuleUI {
  id: string;
  ruleName: string;
  eventType: string;
  actionChannel: string;
  recipientGroup: string;
  priority: string;
  isActive: boolean;
  triggerCount: number;
}

interface TriggerRulesTableProps {
  rules: TriggerRuleUI[];
  onToggleRule: (id: string) => void;
  onEditRule: (rule: TriggerRuleUI) => void;
}

export function TriggerRulesTable({ rules, onToggleRule, onEditRule }: TriggerRulesTableProps) {
  if (rules.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg">
        No automated trigger rules configured. Create a rule to enable automated alerts.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule Name</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Triggers Sent</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.ruleName}</TableCell>
              <TableCell>
                <Badge variant="secondary">{rule.eventType}</Badge>
              </TableCell>
              <TableCell className="uppercase text-xs font-semibold">{rule.actionChannel}</TableCell>
              <TableCell className="capitalize">{rule.recipientGroup}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    rule.priority === "urgent" || rule.priority === "high"
                      ? "destructive"
                      : rule.priority === "normal"
                      ? "info"
                      : "secondary"
                  }
                >
                  {rule.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={rule.isActive ? "success" : "secondary"}>
                  {rule.isActive ? "Active" : "Paused"}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{rule.triggerCount}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => onToggleRule(rule.id)}>
                  {rule.isActive ? "Pause" : "Enable"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onEditRule(rule)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
