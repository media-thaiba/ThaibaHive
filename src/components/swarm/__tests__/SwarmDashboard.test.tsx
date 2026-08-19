import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwarmTopology } from "../SwarmTopology";
import { NegotiationTracker } from "../NegotiationTracker";
import { TelemetryDashboard } from "../TelemetryDashboard";
import { ComplianceMonitor } from "../ComplianceMonitor";

describe("Swarm Observability Components", () => {
  const mockNodes = [
    { id: "node_1", nodeId: "Global Coordinator", tier: "global" as const, status: "active", lastSeenAt: new Date().toISOString() },
    { id: "node_2", nodeId: "Regional North", tier: "regional" as const, status: "active", lastSeenAt: new Date().toISOString() },
    { id: "node_3", nodeId: "Local Agent 1", tier: "local" as const, status: "active", lastSeenAt: new Date().toISOString() },
  ];

  const mockSessions = [
    { id: "s1", sessionId: "sess_001", agentId: "agent_a", status: "active", createdAt: new Date().toISOString(), resourceId: "res_lock_1" },
  ];

  const mockMetrics = [
    { id: "m1", nodeId: "node_3", metricName: "mergeLatencyMs_avg_1m", metricValue: 20, timestamp: new Date().toISOString() },
  ];

  const mockFindings = [
    { id: "f1", framework: "GDPR", ruleName: "DATA_ENCRYPTION_REST", severity: "critical" as const, status: "failed" as const, description: "Unencrypted data", createdAt: new Date().toISOString() },
  ];

  test("renders SwarmTopology hierarchy view", () => {
    render(<SwarmTopology nodes={mockNodes} />);
    expect(screen.getByText("Swarm Node Topology")).toBeInTheDocument();
  });

  test("renders NegotiationTracker sessions list", () => {
    const onTriggerEscalation = jest.fn();
    render(<NegotiationTracker sessions={mockSessions} onTriggerEscalation={onTriggerEscalation} />);
    expect(screen.getByText("sess_001")).toBeInTheDocument();
  });

  test("renders TelemetryDashboard performance metrics", () => {
    render(<TelemetryDashboard metrics={mockMetrics} />);
    expect(screen.getByText("Vector-Mesh Sync Telemetry")).toBeInTheDocument();
  });

  test("renders ComplianceMonitor widget and handles manual remediation triggers", () => {
    const onTriggerRemediation = jest.fn();
    render(<ComplianceMonitor findings={mockFindings} onTriggerRemediation={onTriggerRemediation} />);
    expect(screen.getByText("DATA_ENCRYPTION_REST")).toBeInTheDocument();

    // Open detail dialog
    fireEvent.click(screen.getByText("DATA_ENCRYPTION_REST"));
    
    const triggerBtn = screen.getByText("Trigger Self-Healing Remediation");
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);

    expect(onTriggerRemediation).toHaveBeenCalledWith("f1");
  });
});
