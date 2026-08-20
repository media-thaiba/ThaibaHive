import { z } from 'zod';

export const kmSearchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  topK: z.number().int().min(1).max(50).optional().default(5),
  category: z.enum(['academic', 'policy', 'administrative', 'faculty']).optional(),
  enableReranking: z.boolean().optional().default(true),
  institutionId: z.string().optional().default('global'),
});

export const kmGraphQuerySchema = z.object({
  startNodeId: z.string().min(1, 'startNodeId is required'),
  maxHops: z.number().int().min(1).max(10).optional().default(3),
  filterRelation: z.enum([
    'prerequisite_of',
    'co_requisite',
    'offered_by',
    'fulfills_requirement',
    'governed_by',
    'taught_by',
    'leads_to_career',
  ]).optional(),
});

export const kmDocumentIngestSchema = z.object({
  documentId: z.string().optional(),
  title: z.string().min(1, 'Document title is required'),
  category: z.enum(['academic', 'policy', 'administrative', 'faculty']).default('academic'),
  fileType: z.enum(['pdf', 'docx', 'md', 'html', 'txt']).default('md'),
  rawText: z.string().min(1, 'Document content cannot be empty'),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  institutionId: z.string().optional().default('global'),
});

export const kmDocumentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(['academic', 'policy', 'administrative', 'faculty']).optional(),
  status: z.enum(['pending', 'processing', 'indexed', 'failed']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const kmDegreeAuditSchema = z.object({
  studentId: z.string().min(1, 'studentId is required'),
  programCode: z.string().min(1, 'programCode is required').default('BS-CS'),
  transcript: z.array(
    z.object({
      courseCode: z.string(),
      courseTitle: z.string(),
      credits: z.number(),
      grade: z.string(),
      term: z.string(),
      isMajorCourse: z.boolean().optional(),
    })
  ).optional().default([]),
});

export const kmAdvisingChatSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  studentId: z.string().min(1, 'studentId is required'),
  prompt: z.string().min(1, 'prompt cannot be empty'),
  targetLanguage: z.string().optional().default('en'),
  institutionId: z.string().optional().default('global'),
});

export const kmRecommendationsSchema = z.object({
  studentId: z.string().min(1, 'studentId is required'),
  type: z.enum(['electives', 'careers', 'schedule']).default('electives'),
  targetTermsCount: z.number().int().min(1).max(8).optional().default(4),
});
