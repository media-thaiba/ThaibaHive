import { AgentTool, validateToolContract } from "./contract";

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, AgentTool> = new Map();
  private institutionAllowlists: Map<string, Set<string>> = new Map(); // institutionId -> Set<toolName>

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: AgentTool): void {
    const validation = validateToolContract(tool);
    if (!validation.valid) {
      throw new Error(`Invalid tool contract for '${tool.name}': ${validation.errors.join(", ")}`);
    }
    this.tools.set(tool.name, tool);
  }

  public getTool(toolName: string, institutionId?: string): AgentTool | undefined {
    const tool = this.tools.get(toolName);
    if (!tool) return undefined;

    if (institutionId && institutionId !== "global") {
      const allowlist = this.institutionAllowlists.get(institutionId);
      if (allowlist && !allowlist.has(toolName)) {
        return undefined; // Not allowed for this tenant
      }
    }

    return tool;
  }

  public listTools(filters?: { domain?: string; institutionId?: string }): AgentTool[] {
    return Array.from(this.tools.values()).filter((tool) => {
      if (filters?.domain && tool.domain !== filters.domain) return false;
      if (filters?.institutionId && filters.institutionId !== "global") {
        const allowlist = this.institutionAllowlists.get(filters.institutionId);
        if (allowlist && !allowlist.has(tool.name)) return false;
      }
      return true;
    });
  }

  public setInstitutionAllowlist(institutionId: string, allowedToolNames: string[]): void {
    this.institutionAllowlists.set(institutionId, new Set(allowedToolNames));
  }

  public clear(): void {
    this.tools.clear();
    this.institutionAllowlists.clear();
  }
}

export const toolRegistry = ToolRegistry.getInstance();
