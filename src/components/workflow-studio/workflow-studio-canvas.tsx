"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  Play,
  Zap,
  UserCheck,
  Clock,
  Split,
  Bell,
  Cpu,
  Workflow,
  List,
} from "lucide-react";
import type { StudioCanvasState, StudioNodeType, StudioNodeData } from "@/lib/workflow-studio/graph-compiler";

// ─── Palette Definition ───

export interface PaletteItem {
  nodeType: StudioNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const STUDIO_PALETTE: PaletteItem[] = [
  { nodeType: "trigger", label: "Trigger", description: "Workflow entry point (manual, schedule, event, anomaly)", icon: <Zap aria-hidden /> },
  { nodeType: "action", label: "Action", description: "Generic tool execution step", icon: <Play aria-hidden /> },
  { nodeType: "agentStep", label: "Agent Step", description: "Delegated agent task with tool binding", icon: <Workflow aria-hidden /> },
  { nodeType: "branch", label: "Branch", description: "Condition split with then/else paths", icon: <GitBranch aria-hidden /> },
  { nodeType: "approval", label: "Approval Gate", description: "Human-in-the-loop approval checkpoint", icon: <UserCheck aria-hidden /> },
  { nodeType: "wait", label: "Wait", description: "Timed delay before continuing", icon: <Clock aria-hidden /> },
  { nodeType: "parallel", label: "Parallel", description: "Fan-out to concurrent branches", icon: <Split aria-hidden /> },
  { nodeType: "notification", label: "Notification", description: "Push / chat notification action", icon: <Bell aria-hidden /> },
  { nodeType: "hardware", label: "Hardware", description: "Hardware or IoT device action", icon: <Cpu aria-hidden /> },
];

// ─── Custom Node ───

const NODE_TYPE_STYLES: Record<StudioNodeType, { border: string; bg: string }> = {
  trigger: { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  action: { border: "border-sky-500", bg: "bg-sky-50 dark:bg-sky-950/30" },
  agentStep: { border: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  branch: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  approval: { border: "border-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  wait: { border: "border-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30" },
  parallel: { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30" },
  notification: { border: "border-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  hardware: { border: "border-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
};

function StudioNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as StudioNodeData;
  const style = NODE_TYPE_STYLES[d.nodeType] || NODE_TYPE_STYLES.action;
  return (
    <div
      className={`rounded-md border-2 ${style.border} ${style.bg} px-3 py-2 min-w-[160px] shadow-sm ${selected ? "ring-2 ring-ring" : ""}`}
      role="group"
      aria-label={`${d.nodeType} node: ${d.label}`}
      tabIndex={0}
    >
      {d.nodeType !== "trigger" && (
        <Handle type="target" position={Position.Left} aria-label="Input connection" />
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold truncate max-w-[120px]">{d.label}</span>
        <Badge variant="secondary" className="text-[10px] px-1 py-0">
          {d.nodeType}
        </Badge>
      </div>
      {d.tool && <p className="text-[10px] text-muted-foreground mt-1 truncate">{d.tool}</p>}
      {d.condition && (
        <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">{d.condition}</p>
      )}
      {d.nodeType === "branch" && (
        <>
          <Handle id="then" type="source" position={Position.Right} style={{ top: "30%" }} aria-label="Then branch" />
          <Handle id="else" type="source" position={Position.Right} style={{ top: "70%" }} aria-label="Else branch" />
        </>
      )}
      {d.nodeType === "parallel" && (
        <Handle id="parallel" type="source" position={Position.Right} aria-label="Parallel fan-out" />
      )}
      {(d.nodeType === "action" || d.nodeType === "agentStep" || d.nodeType === "approval" || d.nodeType === "wait" || d.nodeType === "notification" || d.nodeType === "hardware") && (
        <Handle id="out" type="source" position={Position.Right} aria-label="Output connection" />
      )}
    </div>
  );
}

const nodeTypes = { studio: StudioNodeComponent };

// ─── Accessible Palette (keyboard-operable) ───

export function StudioPalette({ onAddNode, disabled }: { onAddNode: (nodeType: StudioNodeType) => void; disabled?: boolean }) {
  return (
    <nav aria-label="Node palette" className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Add Node</h3>
      {STUDIO_PALETTE.map((item) => (
        <Button
          key={item.nodeType}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onAddNode(item.nodeType)}
          aria-label={`Add ${item.label} node: ${item.description}`}
          className="justify-start h-auto py-1.5"
        >
          <span className="mr-2 text-muted-foreground">{item.icon}</span>
          <span className="flex flex-col items-start">
            <span className="text-xs font-medium">{item.label}</span>
            <span className="text-[10px] text-muted-foreground font-normal">{item.description}</span>
          </span>
        </Button>
      ))}
    </nav>
  );
}

// ─── Accessible Nodes/Edges List Fallback (Gate 12) ───

export function StudioGraphList({ canvas }: { canvas: StudioCanvasState }) {
  return (
    <section aria-label="Workflow graph structure (accessible list)" className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <List aria-hidden className="h-3.5 w-3.5" /> Graph Structure
      </h3>
      <div>
        <h4 className="text-xs font-medium mb-1">Nodes ({canvas.nodes.length})</h4>
        <ul className="space-y-0.5">
          {canvas.nodes.map((n) => (
            <li key={n.id} className="text-xs text-muted-foreground">
              <span className="font-mono">{n.id}</span> — {n.data.nodeType}
              {n.data.tool ? ` (${n.data.tool})` : ""}
              {n.data.condition ? ` [${n.data.condition}]` : ""}
            </li>
          ))}
          {canvas.nodes.length === 0 && <li className="text-xs text-muted-foreground italic">No nodes yet</li>}
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-medium mb-1">Edges ({canvas.edges.length})</h4>
        <ul className="space-y-0.5">
          {canvas.edges.map((e, i) => (
            <li key={e.id || i} className="text-xs text-muted-foreground">
              <span className="font-mono">{e.source}</span> → <span className="font-mono">{e.target}</span>
              {e.sourceHandle && e.sourceHandle !== "out" ? ` (${e.sourceHandle})` : ""}
              {e.label ? ` [${e.label}]` : ""}
            </li>
          ))}
          {canvas.edges.length === 0 && <li className="text-xs text-muted-foreground italic">No edges yet</li>}
        </ul>
      </div>
    </section>
  );
}

// ─── Main Canvas ───

export interface WorkflowStudioCanvasProps {
  initialCanvas?: StudioCanvasState;
  onCanvasChange?: (canvas: StudioCanvasState) => void;
  readOnly?: boolean;
}

let nodeCounter = 0;

export default function WorkflowStudioCanvas({ initialCanvas, onCanvasChange, readOnly }: WorkflowStudioCanvasProps) {
  const toFlowNodes = useCallback((canvas?: StudioCanvasState): Node[] => {
    if (!canvas?.nodes) return [];
    return canvas.nodes.map((n) => ({
      id: n.id,
      type: "studio",
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
    }));
  }, []);

  const toFlowEdges = useCallback((canvas?: StudioCanvasState): Edge[] => {
    if (!canvas?.edges) return [];
    return canvas.edges.map((e, i) => ({
      id: e.id || `e-${i}`,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
      ...(e.label ? { label: e.label } : {}),
      markerEnd: { type: MarkerType.ArrowClosed },
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initialCanvas));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(initialCanvas));
  const [showList, setShowList] = useState(false);

  const emitCanvas = useCallback(
    (ns: Node[], es: Edge[]) => {
      onCanvasChange?.({
        nodes: ns.map((n) => ({
          id: n.id,
          position: n.position,
          data: n.data as unknown as StudioNodeData,
        })),
        edges: es.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          ...(typeof e.label === "string" ? { label: e.label } : {}),
        })),
      });
    },
    [onCanvasChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds);
        emitCanvas(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, emitCanvas]
  );

  const handleAddNode = useCallback(
    (nodeType: StudioNodeType) => {
      nodeCounter += 1;
      const id = `${nodeType}_${nodeCounter}`;
      const data: StudioNodeData = {
        label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
        nodeType,
        ...(nodeType === "branch" ? { condition: "scope.value > 0" } : {}),
        ...(nodeType === "wait" ? { waitMs: 1000 } : {}),
        ...(nodeType === "action" || nodeType === "notification" || nodeType === "hardware" || nodeType === "agentStep"
          ? { tool: nodeType === "hardware" ? "hardware.action" : nodeType === "notification" ? "notify.push" : "demo.execute" }
          : {}),
        ...(nodeType === "trigger" ? { trigger: { type: "manual" as const } } : {}),
      };
      setNodes((nds) => {
        const next = [
          ...nds,
          {
            id,
            type: "studio",
            position: { x: 120 + (nodeCounter % 5) * 240, y: 80 + Math.floor(nodeCounter / 5) * 140 },
            data: data as unknown as Record<string, unknown>,
          } as Node,
        ];
        emitCanvas(next, edges);
        return next;
      });
    },
    [setNodes, edges, emitCanvas]
  );

  const currentCanvas = useMemo<StudioCanvasState>(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data as unknown as StudioNodeData })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        ...(typeof e.label === "string" ? { label: e.label } : {}),
      })),
    }),
    [nodes, edges]
  );

  return (
    <div className="flex h-full gap-4" data-testid="workflow-studio-canvas">
      <aside className="w-56 shrink-0" aria-label="Studio controls">
        <StudioPalette onAddNode={handleAddNode} disabled={readOnly} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setShowList((v) => !v)}
          aria-expanded={showList}
          aria-controls="studio-graph-list"
        >
          <List aria-hidden className="mr-1.5 h-3.5 w-3.5" />
          {showList ? "Hide" : "Show"} accessible list
        </Button>
      </aside>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex-1 min-h-[420px] rounded-md border" style={{ height: "calc(100vh - 260px)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={!readOnly}
            elementsSelectable
            aria-label="Workflow DAG editor canvas"
          >
            <Background gap={18} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable aria-label="Canvas minimap" />
          </ReactFlow>
        </div>

        {showList && (
          <div className="max-h-56 overflow-y-auto rounded-md border p-3" id="studio-graph-list">
            <StudioGraphList canvas={currentCanvas} />
          </div>
        )}
      </div>
    </div>
  );
}
