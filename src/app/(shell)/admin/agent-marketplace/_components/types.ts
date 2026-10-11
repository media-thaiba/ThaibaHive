export type AgentPlugin = {
  id: string;
  institutionId: string | null;
  scope: "global" | "institution_private" | "institution_shared";
  pluginKey: string;
  displayName: string;
  summary: string;
  description: string | null;
  version: string;
  authorStaffId: string | null;
  authorVerified: boolean;
  category: string;
  capabilitiesJson: string;
  manifestJson: string;
  manifestHash: string;
  approvalStatus: "draft" | "pending_review" | "approved" | "rejected" | "deprecated";
  installedCount: number;
  ratingAvg: number;
  ratingCount: number;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
};

export type PluginManifest = {
  permissions?: string[];
  resourceBudget?: {
    maxExecutionTimeMs?: number;
    maxMemoryMb?: number;
    maxTokens?: number;
  };
  entryDslRef?: string;
  egressUrls?: string[];
  configSchema?: Record<string, unknown>;
  environmentVariables?: string[];
};

export type PluginInstallation = {
  id: string;
  institutionId: string;
  pluginId: string;
  installedVersion: string;
  enabled: boolean;
  grantedToolPermissionsJson: string;
  configJson: string | null;
  installedBy: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  plugin?: AgentPlugin | null;
};

export type PluginReview = {
  id: string;
  institutionId: string;
  pluginId: string;
  reviewerStaffId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PLUGIN_CATEGORIES = [
  "finance",
  "facilities",
  "vision",
  "compliance",
  "academic",
  "hr",
  "general",
] as const;

export const PLUGIN_SCOPES = ["global", "institution_private", "institution_shared"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  finance: "Finance",
  facilities: "Facilities",
  vision: "Vision",
  compliance: "Compliance",
  academic: "Academic",
  hr: "HR",
  general: "General",
};

export const APPROVAL_VARIANT: Record<
  AgentPlugin["approvalStatus"],
  "success" | "warning" | "destructive" | "secondary" | "info"
> = {
  approved: "success",
  pending_review: "warning",
  rejected: "destructive",
  deprecated: "secondary",
  draft: "info",
};

export const SCOPE_LABEL: Record<AgentPlugin["scope"], string> = {
  global: "Global",
  institution_private: "Institution private",
  institution_shared: "Institution shared",
};

export function parseCapabilities(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function parseManifest(json: string | null | undefined): PluginManifest {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as PluginManifest) : {};
  } catch {
    return {};
  }
}

export function parseStringArray(json: string | null | undefined): string[] {
  return parseCapabilities(json);
}
