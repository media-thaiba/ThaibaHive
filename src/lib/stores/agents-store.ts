import { create } from "zustand";

export interface AgentInfo {
  id: string;
  role: string;
  domain: string;
  status: "idle" | "running" | "busy" | "error" | "paused";
  currentLoad: number;
  maxConcurrency: number;
  capabilities: string[];
  permissionScopes: string[];
  institutionId?: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  version: number;
  definitionJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunItem {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "awaiting_approval" | "failed" | "rolled_back" | "cancelled" | "skipped";
  triggerType: string;
  triggeredBy: string;
  contextJson?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface ApprovalGateItem {
  id: string;
  runId: string;
  stepId?: string;
  requiredPermission: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "pending" | "approved" | "rejected" | "expired";
  approverId?: string;
  decisionReason?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface TelemetryEvent {
  seq: number;
  timestamp: string;
  type: string;
  data: any;
}

interface AgentsState {
  agents: AgentInfo[];
  workflows: WorkflowItem[];
  runs: WorkflowRunItem[];
  approvalGates: ApprovalGateItem[];
  telemetryEvents: TelemetryEvent[];
  killSwitchEngaged: boolean;
  selectedRunId: string | null;
  selectedRunSteps: any[];
  isLoading: boolean;
  error: string | null;
  connectedStream: boolean;

  // Actions
  fetchAgents: () => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  fetchRuns: () => Promise<void>;
  fetchApprovalGates: () => Promise<void>;
  fetchKillSwitchStatus: () => Promise<void>;
  selectRun: (runId: string) => Promise<void>;
  executeWorkflow: (workflowId: string, context?: any) => Promise<any>;
  decideApproval: (gateId: string, decision: "approved" | "rejected", reason: string) => Promise<any>;
  toggleKillSwitch: (action: "engage" | "disengage", confirmationText: string, reason?: string) => Promise<any>;
  addTelemetryEvent: (event: TelemetryEvent) => void;
  initStream: () => () => void;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  workflows: [],
  runs: [],
  approvalGates: [],
  telemetryEvents: [],
  killSwitchEngaged: false,
  selectedRunId: null,
  selectedRunSteps: [],
  isLoading: false,
  error: null,
  connectedStream: false,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to load agents");
      const data = await res.json();
      set({ agents: data.agents || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchWorkflows: async () => {
    try {
      const res = await fetch("/api/agents/workflows");
      if (!res.ok) throw new Error("Failed to load workflows");
      const data = await res.json();
      set({ workflows: data.workflows || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchRuns: async () => {
    try {
      const res = await fetch("/api/agents/runs");
      if (!res.ok) throw new Error("Failed to load workflow runs");
      const data = await res.json();
      set({ runs: data.runs || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchApprovalGates: async () => {
    try {
      const res = await fetch("/api/agents/approvals?status=pending");
      if (!res.ok) throw new Error("Failed to load approvals");
      const data = await res.json();
      set({ approvalGates: data.approvalGates || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchKillSwitchStatus: async () => {
    try {
      const res = await fetch("/api/agents/guardrails/killswitch");
      if (!res.ok) throw new Error("Failed to load killswitch status");
      const data = await res.json();
      set({ killSwitchEngaged: !!data.engaged });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  selectRun: async (runId: string) => {
    set({ selectedRunId: runId, isLoading: true });
    try {
      const res = await fetch(`/api/agents/runs/${runId}`);
      if (!res.ok) throw new Error("Failed to fetch run details");
      const data = await res.json();
      set({ selectedRunSteps: data.steps || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  executeWorkflow: async (workflowId: string, context: any = {}) => {
    try {
      const res = await fetch(`/api/agents/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await res.json();
      await get().fetchRuns();
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  decideApproval: async (gateId: string, decision: "approved" | "rejected", reason: string) => {
    try {
      const res = await fetch(`/api/agents/approvals/${gateId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      await get().fetchApprovalGates();
      await get().fetchRuns();
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleKillSwitch: async (action: "engage" | "disengage", confirmationText: string, reason?: string) => {
    try {
      const res = await fetch("/api/agents/guardrails/killswitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmationText, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Killswitch action failed");
      set({ killSwitchEngaged: action === "engage" });
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addTelemetryEvent: (event: TelemetryEvent) => {
    set((state) => ({
      telemetryEvents: [event, ...state.telemetryEvents].slice(0, 100),
    }));
  },

  initStream: () => {
    if (typeof window === "undefined") return () => {};

    const eventSource = new EventSource("/api/agents/stream");

    eventSource.onopen = () => {
      set({ connectedStream: true });
    };

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        get().addTelemetryEvent(payload);
      } catch {}
    };

    eventSource.onerror = () => {
      set({ connectedStream: false });
    };

    return () => {
      eventSource.close();
      set({ connectedStream: false });
    };
  },
}));
