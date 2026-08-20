import { hybridFusionEngine } from '../../retrieval/hybrid-fusion-engine';
import { campusGraph } from '../../graph/knowledge-graph-engine';
import { degreeAuditor } from '../../advising/degree-auditor';
import { prerequisiteValidator } from '../../advising/prereq-validator';
import { scheduleOptimizer } from '../../advising/schedule-optimizer';
import { CopilotToolExecution } from '../../km-types';

export interface ToolDefinition {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
}

export class CopilotToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public async executeTool(name: string, args: any): Promise<CopilotToolExecution> {
    const tool = this.tools.get(name);
    const start = Date.now();

    if (!tool) {
      return {
        toolName: name,
        input: args,
        output: { error: `Tool ${name} not found` },
        executionTimeMs: Date.now() - start,
      };
    }

    try {
      const output = await tool.execute(args);
      return {
        toolName: name,
        input: args,
        output,
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: name,
        input: args,
        output: { error: err?.message || 'Tool execution error' },
        executionTimeMs: Date.now() - start,
      };
    }
  }

  private registerDefaultTools(): void {
    // 1. Policy & Knowledge Search Tool
    this.registerTool({
      name: 'policy_search_tool',
      description: 'Search campus policies, bylaws, syllabi and catalogs via Hybrid RAG',
      execute: async (args: { query: string; category?: string }) => {
        return await hybridFusionEngine.search(args.query, { category: args.category, topK: 3 });
      },
    });

    // 2. Prerequisite Check Tool
    this.registerTool({
      name: 'prerequisite_check_tool',
      description: 'Check if student meets prerequisites for a target course',
      execute: async (args: { targetCourseCode: string; completedCourses: string[] }) => {
        return prerequisiteValidator.validatePrerequisites(args.targetCourseCode, args.completedCourses || []);
      },
    });

    // 3. Degree Progress Audit Tool
    this.registerTool({
      name: 'degree_audit_tool',
      description: 'Audit student progress against degree program curriculum',
      execute: async (args: { studentId: string; transcript: any[]; curriculum: any }) => {
        return degreeAuditor.auditStudentDegree(args.studentId, args.transcript || [], args.curriculum);
      },
    });

    // 4. Schedule Optimizer Tool
    this.registerTool({
      name: 'schedule_optimizer_tool',
      description: 'Generate multi-semester optimal graduation schedule',
      execute: async (args: { missingCourses: string[]; completedCourses: string[] }) => {
        return scheduleOptimizer.generateOptimalSchedule(args.missingCourses || [], args.completedCourses || []);
      },
    });
  }
}

export const copilotToolRegistry = new CopilotToolRegistry();
