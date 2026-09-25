import { z } from 'zod';

export const programCreateSchema = z.object({
  programCode: z.string().min(2),
  title: z.string().min(3),
  departmentId: z.string().optional(),
  degreeType: z.enum(['bachelor', 'master', 'doctorate', 'associate', 'diploma']).default('bachelor'),
  totalCreditsRequired: z.number().int().min(30).max(240).default(120),
  minimumGpa: z.number().min(0.0).max(4.0).default(2.0),
  catalogYear: z.string().default('2026-2027'),
  status: z.enum(['active', 'archived', 'draft']).default('active'),
  curriculumComplexityIndex: z.number().optional().default(0.0),
  institutionId: z.string().default('global'),
});

export const courseCreateSchema = z.object({
  courseCode: z.string().min(2),
  title: z.string().min(3),
  departmentId: z.string().optional(),
  credits: z.number().int().min(1).max(12).default(3),
  level: z.number().int().min(100).max(900).default(100),
  courseType: z.enum(['major_core', 'major_elective', 'gen_ed', 'open_elective']).default('major_core'),
  minGrade: z.string().default('D'),
  typicalTerm: z.number().int().min(1).max(12).default(1),
  historicalPassRate: z.number().min(0.0).max(1.0).default(0.85),
  blockingFactor: z.number().int().optional().default(0),
  description: z.string().optional(),
  syllabusEmbedding: z.string().optional(),
  status: z.enum(['active', 'archived']).default('active'),
  institutionId: z.string().default('global'),
});

export const prerequisiteCreateSchema = z.object({
  courseId: z.string().min(1),
  prerequisiteCourseId: z.string().min(1),
  type: z.enum(['hard_prerequisite', 'corequisite', 'advisory']).default('hard_prerequisite'),
  minimumGrade: z.string().default('C'),
  concurrencyAllowed: z.boolean().default(false),
  institutionId: z.string().default('global'),
});

export const planCreateSchema = z.object({
  planId: z.string().min(1),
  studentId: z.string().min(1),
  programId: z.string().min(1),
  title: z.string().default('Primary Degree Plan'),
  targetGraduationTerm: z.string().default('Spring 2030'),
  totalTerms: z.number().int().min(1).max(16).default(8),
  status: z.enum(['draft', 'submitted', 'approved', 'superseded']).default('draft'),
  institutionId: z.string().default('global'),
  courses: z.array(
    z.object({
      courseId: z.string().min(1),
      plannedTermIndex: z.number().int().min(1).max(16),
      termName: z.string().min(1),
      credits: z.number().int().optional().default(3),
    })
  ).optional(),
});

export const planApprovalSchema = z.object({
  status: z.enum(['draft', 'submitted', 'approved', 'superseded']),
  advisorId: z.string().optional(),
  justification: z.string().optional(),
});

export const transferCreateSchema = z.object({
  articulationId: z.string().min(1),
  studentId: z.string().min(1),
  sourceInstitution: z.string().min(2),
  sourceCourseCode: z.string().min(2),
  sourceCourseTitle: z.string().min(2),
  sourceCredits: z.number().min(0.5).max(12.0).default(3.0),
  sourceGrade: z.string().min(1),
  targetCourseId: z.string().optional(),
  semanticMatchScore: z.number().optional().default(0.0),
  status: z.enum(['pending', 'approved', 'rejected', 'faculty_review']).default('pending'),
  waiverReason: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const advisingMessageSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  prompt: z.string().min(1),
  forcedDomain: z.enum(['degree_planner', 'career_alignment', 'transfer_articulation', 'financial_aid_load', 'academic_recovery']).optional(),
  institutionId: z.string().default('global'),
});

export const retentionAlertUpdateSchema = z.object({
  status: z.enum(['open', 'triaged', 'in_intervention', 'resolved', 'dismissed']),
  resolutionNotes: z.string().optional(),
  assignedCounselorId: z.string().optional(),
});
