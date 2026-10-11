export type LiveSessionStatus = "active" | "completed" | "failed" | "terminated" | "expired";

export type LiveSession = {
  id: string;
  institutionId: string;
  sessionType: "cctv_analysis" | "operator_console";
  cameraZoneId: string | null;
  modelId: string;
  status: LiveSessionStatus;
  keyframeIntervalSeconds: number;
  maxDurationSeconds: number;
  totalSeconds: number;
  totalFrames: number;
  totalTokens: number;
  startedBy: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type TranscriptEvent = {
  id: string;
  sessionId: string;
  speaker: "user" | "agent" | "system";
  text: string;
  isFinal: boolean;
  timestamp: number;
};

export type HazardEvent = {
  id: string;
  sessionId: string;
  hazardType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  confidence: number;
  timestamp: number;
};

export type ToolCallEvent = {
  id: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: number;
};

export type StreamEvent =
  | { kind: "transcript"; data: TranscriptEvent }
  | { kind: "hazard"; data: HazardEvent }
  | { kind: "tool_call"; data: ToolCallEvent }
  | { kind: "status"; data: { status: string } }
  | { kind: "session_ended"; data: { status: string; sessionId: string } }
  | { kind: "error"; data: { message?: string; error?: string } };

export const SESSION_STATUS_VARIANT: Record<
  LiveSessionStatus,
  "success" | "secondary" | "destructive" | "warning" | "info"
> = {
  active: "success",
  completed: "secondary",
  failed: "destructive",
  terminated: "warning",
  expired: "info",
};

export const HAZARD_SEVERITY_VARIANT: Record<HazardEvent["severity"], "info" | "warning" | "destructive"> = {
  low: "info",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
};

export const SESSION_TYPE_LABEL: Record<LiveSession["sessionType"], string> = {
  cctv_analysis: "CCTV analysis",
  operator_console: "Operator console",
};
