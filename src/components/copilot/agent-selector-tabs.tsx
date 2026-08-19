"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export interface AgentSelectorTabsProps {
  selectedAgent: "academic_advisor" | "financial_controller" | "compliance_auditor";
  onSelect: (agent: "academic_advisor" | "financial_controller" | "compliance_auditor") => void;
}

export function AgentSelectorTabs({ selectedAgent, onSelect }: AgentSelectorTabsProps) {
  return (
    <div className="flex space-x-2 border-b border-slate-800 pb-3">
      <Button
        variant={selectedAgent === "academic_advisor" ? "default" : "outline"}
        onClick={() => onSelect("academic_advisor")}
        className="text-sm font-medium"
      >
        Academic Advisor Copilot
      </Button>
      <Button
        variant={selectedAgent === "financial_controller" ? "default" : "outline"}
        onClick={() => onSelect("financial_controller")}
        className="text-sm font-medium"
      >
        Financial Controller Copilot
      </Button>
      <Button
        variant={selectedAgent === "compliance_auditor" ? "default" : "outline"}
        onClick={() => onSelect("compliance_auditor")}
        className="text-sm font-medium"
      >
        Regional Compliance Auditor
      </Button>
    </div>
  );
}
