"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SwarmTopologyView() {
  const agents = [
    { id: "agent_academic_advisor", name: "Academic Advisor Copilot", domain: "Academic Intelligence", status: "ONLINE", version: "v2.3.0" },
    { id: "agent_financial_controller", name: "Financial Controller Copilot", domain: "Financial Intelligence", status: "ONLINE", version: "v2.3.0" },
    { id: "agent_compliance_auditor", name: "Regional Compliance Auditor", domain: "Governance & Security", status: "ONLINE", version: "v2.3.0" },
  ];

  return (
    <Card className="border border-slate-700 bg-slate-900 text-slate-100 shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-white">Active Multi-Agent Swarm Topology</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs uppercase text-slate-400">{agent.domain}</span>
                <Badge variant="success">{agent.status}</Badge>
              </div>
              <h4 className="text-sm font-bold text-white">{agent.name}</h4>
              <p className="mt-2 text-xs text-slate-400">ID: {agent.id}</p>
              <p className="text-xs text-slate-500">Version: {agent.version}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
