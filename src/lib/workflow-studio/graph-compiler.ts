import crypto from "crypto";
import { parseWorkflowDsl } from "@/lib/agents/workflow/dsl/parser";
import { validateWorkflowDsl } from "@/lib/agents/workflow/dsl/validator";
import { workflowDslSchema, type WorkflowDsl } from "@/lib/agents/workflow/dsl/schema";

// ─── Studio Canvas Types ───

export type StudioNodeType =
  | "trigger"
  | "action"
  | "agentStep"
  | "branch"
  | "approval"
  | "wait"
  | "parallel"
  | "notification"
  | "hardware";

export interface StudioTriggerConfig {
  type: "manual" | "schedule" | "event" | "anomaly";
  cron?: string;
  topic?: string;
  subsystem?: string;
  severityThreshold?: "low" | "medium" | "high" | "critical";
}

export interface StudioApprovalConfig {
  required: boolean;
  permission?: string;
  severity?: "critical" | "high" | "medium" | "low";
  autoExpireHours?: number;
  onExpiry?: "escalate" | "hold" | "reject";
}

export interface StudioNodeData {
  label: string;
  nodeType: StudioNodeType;
  agent?: string;
  tool?: string;
  input?: Record<string, unknown>;
  condition?: string;
  waitMs?: number;
  approval?: StudioApprovalConfig;
  trigger?: StudioTriggerConfig;
}

export interface StudioNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: StudioNodeData;
}

export interface StudioEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string;
}

export interface StudioCanvasState {
  nodes: StudioNode[];
  edges: StudioEdge[];
}

export interface CompileResult {
  success: boolean;
  dsl?: WorkflowDsl;
  errors: string[];
  warnings: string[];
  dslHash?: string;
}

export interface ImportResult {
  canvas: StudioCanvasState;
  errors: string[];
}

// ─── Helpers ───

export function computeDslHash(dsl: WorkflowDsl): string {
  const canonical = JSON.stringify(dsl, Object.keys(dsl).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function isBranchNode(data: StudioNodeData): boolean {
  return data.nodeType === "branch";
}

function isParallelNode(data: StudioNodeData): boolean {
  return data.nodeType === "parallel";
}

function isTriggerNode(data: StudioNodeData): boolean {
  return data.nodeType === "trigger";
}

/** Kahn topological sort; returns null when a cycle exists. */
function topologicalSort(nodeIds: string[], edges: StudioEdge[]): string[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }
  for (const e of edges) {
    if (!inDegree.has(e.target) || !adjacency.has(e.source)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjacency.get(e.source)!.push(e.target);
  }
  const queue = nodeIds.filter((id) => (inDegree.get(id) || 0) === 0);
  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const next of adjacency.get(id) || []) {
      const deg = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }
  return sorted.length === nodeIds.length ? sorted : null;
}

// ─── Canvas → DSL Compilation ───

export function compileCanvasToDsl(
  canvas: StudioCanvasState,
  meta: { key: string; name: string; description?: string }
): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canvas?.nodes || !Array.isArray(canvas.nodes)) {
    return { success: false, errors: ["canvas_state.nodes must be an array"], warnings };
  }
  if (!canvas?.edges || !Array.isArray(canvas.edges)) {
    return { success: false, errors: ["canvas_state.edges must be an array"], warnings };
  }

  const nodes = canvas.nodes;
  const edges = canvas.edges;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Duplicate node id check
  if (nodeById.size !== nodes.length) {
    errors.push("Duplicate node ids detected in canvas");
  }

  // Exactly one trigger node
  const triggerNodes = nodes.filter((n) => isTriggerNode(n.data));
  if (triggerNodes.length === 0) {
    errors.push("Canvas must contain exactly one trigger node");
  } else if (triggerNodes.length > 1) {
    errors.push(`Canvas must contain exactly one trigger node; found ${triggerNodes.length}`);
  }

  // Edge endpoint validation
  for (const e of edges) {
    if (!nodeById.has(e.source)) errors.push(`Edge references unknown source node '${e.source}'`);
    if (!nodeById.has(e.target)) errors.push(`Edge references unknown target node '${e.target}'`);
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const triggerId = triggerNodes[0].id;
  const stepNodes = nodes.filter((n) => n.id !== triggerId);

  // Topological sort over step nodes (cycles rejected here + by AST validator)
  const sortedIds = topologicalSort(
    stepNodes.map((n) => n.id),
    edges.filter((e) => e.source !== triggerId && e.target !== triggerId)
  );
  if (!sortedIds) {
    return { success: false, errors: ["Cycle detected in workflow graph (topological sort failed)"], warnings };
  }

  // Build steps from node data
  const stepsByKey = new Map<string, Record<string, unknown>>();
  for (const id of sortedIds) {
    const node = nodeById.get(id)!;
    const d = node.data;
    const step: Record<string, unknown> = { key: id };

    switch (d.nodeType) {
      case "agentStep":
        step.type = "action";
        if (d.agent) step.agent = d.agent;
        if (d.tool) step.tool = d.tool;
        if (d.input) step.input = d.input;
        break;
      case "action":
      case "notification":
      case "hardware":
        step.type = "action";
        if (d.tool) step.tool = d.tool;
        if (d.agent) step.agent = d.agent;
        if (d.input) step.input = d.input;
        break;
      case "branch":
        step.type = "branch";
        if (!d.condition || String(d.condition).trim() === "") {
          errors.push(`Branch node '${id}' requires a condition expression`);
        }
        step.condition = d.condition || "";
        break;
      case "approval":
        step.type = "approval";
        step.approval = {
          required: d.approval?.required ?? true,
          permission: d.approval?.permission ?? "agent:workflows:approve",
          severity: d.approval?.severity ?? "medium",
          ...(d.approval?.autoExpireHours !== undefined
            ? { autoExpireHours: d.approval.autoExpireHours }
            : {}),
          onExpiry: d.approval?.onExpiry ?? "escalate",
        };
        break;
      case "wait":
        step.type = "wait";
        step.waitMs = d.waitMs ?? 1000;
        break;
      case "parallel":
        step.type = "parallel";
        step.steps = [];
        break;
      default:
        step.type = "action";
        if (d.tool) step.tool = d.tool;
    }

    stepsByKey.set(id, step);
  }

  // Assign edges to next/then/else (or nested parallel steps)
  const outgoing = new Map<string, StudioEdge[]>();
  for (const e of edges) {
    if (e.source === triggerId) continue;
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  }

  // Parallel fan-out targets are nested under their parallel parent, not top-level steps
  const parallelNestedTargets = new Set<string>();
  for (const [sourceId, outs] of outgoing.entries()) {
    if (isParallelNode(nodeById.get(sourceId)!.data)) {
      for (const e of outs) parallelNestedTargets.add(e.target);
    }
  }

  for (const [sourceId, outs] of outgoing.entries()) {
    const step = stepsByKey.get(sourceId)!;
    const node = nodeById.get(sourceId)!;

    if (isParallelNode(node.data)) {
      // Fan-out edges become nested parallel steps (shallow entries with next chains)
      const nested: Record<string, unknown>[] = [];
      for (const e of outs) {
        const targetStep = stepsByKey.get(e.target);
        if (targetStep) {
          nested.push({ ...targetStep });
        }
      }
      step.steps = nested;
      if (outs.length === 0) {
        errors.push(`Parallel node '${sourceId}' has no outgoing edges`);
      }
      continue;
    }

    if (isBranchNode(node.data)) {
      const thenEdge = outs.find((e) => e.sourceHandle === "then" || e.label === "then");
      const elseEdge = outs.find((e) => e.sourceHandle === "else" || e.label === "else");
      const unlabeled = outs.filter((e) => e !== thenEdge && e !== elseEdge);

      let thenTarget = thenEdge?.target;
      let elseTarget = elseEdge?.target;
      if (!thenTarget && unlabeled.length > 0) thenTarget = unlabeled.shift()!.target;
      if (!elseTarget && unlabeled.length > 0) elseTarget = unlabeled.shift()!.target;

      if (unlabeled.length > 0 || outs.length > 2) {
        errors.push(`Branch node '${sourceId}' has more than 2 outgoing edges; use 'then'/'else' handles`);
      }
      if (!thenTarget) {
        errors.push(`Branch node '${sourceId}' requires a 'then' edge`);
      } else {
        step.then = thenTarget;
      }
      if (elseTarget) step.else = elseTarget;
      continue;
    }

    // Linear nodes: exactly one outgoing edge → next
    if (outs.length > 1) {
      errors.push(
        `Node '${sourceId}' has ${outs.length} outgoing edges; only branch or parallel nodes may fan out`
      );
    } else if (outs.length === 1) {
      step.next = outs[0].target;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  // Trigger configuration
  const triggerData = triggerNodes[0].data.trigger || { type: "manual" as const };
  let trigger: Record<string, unknown>;
  switch (triggerData.type) {
    case "schedule":
      if (!triggerData.cron) {
        return { success: false, errors: ["Schedule trigger requires a cron expression"], warnings };
      }
      trigger = { type: "schedule", cron: triggerData.cron };
      break;
    case "event":
      if (!triggerData.topic) {
        return { success: false, errors: ["Event trigger requires a topic"], warnings };
      }
      trigger = { type: "event", topic: triggerData.topic };
      break;
    case "anomaly":
      if (!triggerData.subsystem) {
        return { success: false, errors: ["Anomaly trigger requires a subsystem"], warnings };
      }
      trigger = {
        type: "anomaly",
        subsystem: triggerData.subsystem,
        severityThreshold: triggerData.severityThreshold || "medium",
      };
      break;
    default:
      trigger = { type: "manual" };
  }

  // Steps array in topological order (excluding nested parallel targets)
  const orderedSteps = sortedIds
    .filter((id) => !parallelNestedTargets.has(id))
    .map((id) => stepsByKey.get(id)!);

  const candidate = {
    key: meta.key,
    name: meta.name,
    ...(meta.description ? { description: meta.description } : {}),
    dslVersion: 1,
    version: 1,
    triggers: [trigger],
    steps: orderedSteps,
  };

  // Zod parse for defaults, then AST validation (cycles, dangling targets, dup keys)
  const parseResult = parseWorkflowDsl(candidate);
  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      errors: parseResult.errors?.map((e: any) => e.message || String(e)) || ["DSL parse failed"],
      warnings,
    };
  }

  const dsl = parseResult.data;
  const validation = validateWorkflowDsl(dsl);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: [...warnings, ...validation.warnings] };
  }

  return {
    success: true,
    dsl,
    errors: [],
    warnings: [...warnings, ...validation.warnings],
    dslHash: computeDslHash(dsl),
  };
}

// ─── DSL → Canvas Import ───

const GRID_COLS = 4;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 60;

function stepNodeType(step: Record<string, any>): StudioNodeType {
  switch (step.type) {
    case "branch":
      return "branch";
    case "approval":
      return "approval";
    case "wait":
      return "wait";
    case "parallel":
      return "parallel";
    default:
      if (step.tool?.startsWith("hardware.")) return "hardware";
      if (step.tool?.startsWith("notify") || step.tool?.startsWith("notification")) return "notification";
      if (step.agent) return "agentStep";
      return "action";
  }
}

export function importDslToCanvas(dsl: WorkflowDsl): ImportResult {
  const errors: string[] = [];
  const nodes: StudioNode[] = [];
  const edges: StudioEdge[] = [];

  const parsed = workflowDslSchema.safeParse(dsl);
  if (!parsed.success) {
    return {
      canvas: { nodes: [], edges: [] },
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const valid = parsed.data as WorkflowDsl;

  const trigger = valid.triggers?.[0] || { type: "manual" as const };
  const triggerData: StudioNodeData = {
    label: "Trigger",
    nodeType: "trigger",
    trigger: {
      type: trigger.type,
      ...(trigger.type === "schedule" ? { cron: (trigger as any).cron } : {}),
      ...(trigger.type === "event" ? { topic: (trigger as any).topic } : {}),
      ...(trigger.type === "anomaly"
        ? {
            subsystem: (trigger as any).subsystem,
            severityThreshold: (trigger as any).severityThreshold,
          }
        : {}),
    },
  };
  nodes.push({ id: "trigger", position: { x: 0, y: 80 }, data: triggerData });

  // Flatten nested parallel steps so round-trip preserves their keys
  const flatSteps: Record<string, any>[] = [];
  function flatten(steps: Record<string, any>[]) {
    for (const s of steps) {
      flatSteps.push(s);
      if (Array.isArray(s.steps)) flatten(s.steps);
    }
  }
  flatten(valid.steps as any);

  flatSteps.forEach((step, i) => {
    const col = (i + 1) % GRID_COLS;
    const row = Math.floor((i + 1) / GRID_COLS);
    nodes.push({
      id: step.key,
      position: {
        x: col * (NODE_WIDTH + NODE_GAP_X),
        y: row * (NODE_HEIGHT + NODE_GAP_Y),
      },
      data: {
        label: step.key,
        nodeType: stepNodeType(step),
        ...(step.agent ? { agent: step.agent } : {}),
        ...(step.tool ? { tool: step.tool } : {}),
        ...(step.input ? { input: step.input } : {}),
        ...(step.condition ? { condition: step.condition } : {}),
        ...(step.waitMs !== undefined ? { waitMs: step.waitMs } : {}),
        ...(step.approval ? { approval: step.approval } : {}),
      },
    });
  });

  // Entry edge from trigger to first root step
  if (valid.steps.length > 0) {
    edges.push({ id: "e-trigger-first", source: "trigger", target: valid.steps[0].key });
  }

  const flatKeys = new Set(flatSteps.map((s) => s.key));
  for (const step of flatSteps) {
    if (step.next && flatKeys.has(step.next)) {
      edges.push({
        id: `e-${step.key}-next`,
        source: step.key,
        target: step.next,
        sourceHandle: "out",
      });
    }
    if (step.then && flatKeys.has(step.then)) {
      edges.push({
        id: `e-${step.key}-then`,
        source: step.key,
        target: step.then,
        sourceHandle: "then",
        label: "then",
      });
    }
    if (step.else && flatKeys.has(step.else)) {
      edges.push({
        id: `e-${step.key}-else`,
        source: step.key,
        target: step.else,
        sourceHandle: "else",
        label: "else",
      });
    }
    if (Array.isArray(step.steps)) {
      for (const nested of step.steps) {
        if (nested.key && flatKeys.has(nested.key)) {
          edges.push({
            id: `e-${step.key}-par-${nested.key}`,
            source: step.key,
            target: nested.key,
            sourceHandle: "parallel",
            label: "parallel",
          });
        }
      }
    }
  }

  return { canvas: { nodes, edges }, errors };
}

// ─── Structural Fidelity (for round-trip tests) ───

export interface DslStructureFingerprint {
  keys: string[];
  types: Record<string, string>;
  edges: Array<{ source: string; target: string; kind: "next" | "then" | "else" | "parallel" }>;
  triggerType: string;
}

export function fingerprintDsl(dsl: WorkflowDsl): DslStructureFingerprint {
  const keys: string[] = [];
  const types: Record<string, string> = {};
  const edges: DslStructureFingerprint["edges"] = [];

  function walk(steps: Record<string, any>[]) {
    for (const s of steps) {
      keys.push(s.key);
      types[s.key] = s.type || "action";
      if (s.next) edges.push({ source: s.key, target: s.next, kind: "next" });
      if (s.then) edges.push({ source: s.key, target: s.then, kind: "then" });
      if (s.else) edges.push({ source: s.key, target: s.else, kind: "else" });
      if (Array.isArray(s.steps)) {
        for (const n of s.steps) {
          edges.push({ source: s.key, target: n.key, kind: "parallel" });
        }
        walk(s.steps);
      }
    }
  }
  walk(dsl.steps as any);

  return {
    keys: keys.sort(),
    types,
    edges: edges.sort((a, b) =>
      `${a.source}|${a.target}|${a.kind}`.localeCompare(`${b.source}|${b.target}|${b.kind}`)
    ),
    triggerType: dsl.triggers?.[0]?.type || "manual",
  };
}
