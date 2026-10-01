import { z } from "zod";
import { AgentTool } from "../contract";

export const academicTools: AgentTool[] = [
  {
    name: "academic.attendance.get_anomalies",
    description: "Detects attendance deficits and anomaly streaks across classes and sections.",
    domain: "academic",
    type: "read",
    requiredPermission: "agent:workflows:view",
    riskLevel: "low",
    inputSchema: z.object({
      classId: z.string().optional(),
      thresholdPercent: z.number().default(75),
    }),
    outputSchema: z.object({
      totalAnomalies: z.number(),
      flaggedStudents: z.array(z.object({ studentId: z.string(), attendanceRate: z.number() })),
    }),
    execute: async (input) => {
      return {
        totalAnomalies: 2,
        flaggedStudents: [
          { studentId: "std_101", attendanceRate: 68.5 },
          { studentId: "std_104", attendanceRate: 71.0 },
        ],
      };
    },
  },
  {
    name: "academic.attendance.reconcile",
    description: "Reconciles biometric attendance records with daily classroom logs.",
    domain: "academic",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({
      sectionId: z.string(),
      date: z.string(),
    }),
    outputSchema: z.object({
      reconciledCount: z.number(),
      status: z.string(),
    }),
    execute: async (input) => {
      return {
        reconciledCount: 38,
        status: "reconciled",
      };
    },
    compensate: async (input) => {
      return {
        success: true,
        message: `Rolled back attendance reconciliation for section ${input.sectionId} on ${input.date}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "academic.grades.post_batch",
    description: "Orchestrates batch grade posting for end-of-term assessments.",
    domain: "academic",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "high",
    inputSchema: z.object({
      termId: z.string(),
      courseId: z.string(),
      grades: z.array(z.object({ studentId: z.string(), score: z.number() })),
    }),
    outputSchema: z.object({
      postedCount: z.number(),
      batchId: z.string(),
    }),
    execute: async (input) => {
      return {
        postedCount: input.grades.length,
        batchId: `batch_${Date.now()}`,
      };
    },
    compensate: async (input, output) => {
      return {
        success: true,
        message: `Unposted grade batch ${output?.batchId}`,
        compensatedAt: new Date().toISOString(),
      };
    },
  },
  {
    name: "academic.timetables.resolve_conflicts",
    description: "Autonomously detects and resolves classroom and faculty schedule collisions.",
    domain: "academic",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({
      departmentId: z.string(),
      academicYear: z.string(),
    }),
    outputSchema: z.object({
      conflictsResolved: z.number(),
      timetableRevision: z.string(),
    }),
    execute: async () => {
      return {
        conflictsResolved: 3,
        timetableRevision: "v2.1",
      };
    },
    compensate: async () => {
      return {
        success: true,
        message: "Restored previous timetable version",
        compensatedAt: new Date().toISOString(),
      };
    },
  },
];
