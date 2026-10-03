import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { z } from 'zod';
import { ComplianceRuleEngine } from '@/lib/compliance/compliance-rule-engine';
import { ComplianceReportGenerator } from '@/lib/compliance/compliance-report-generator';
import type { SessionPayload } from '@thaiba/auth';

const schema = z.object({
  institutionId: z.string().min(1),
  frameworks: z.array(z.enum(['gdpr', 'hipaa', 'soc2', 'ferpa', 'malaysia-education'])).min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'markdown']).default('json'),
});

async function handler(req: Request, _session: SessionPayload) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { institutionId, frameworks, format } = parsed.data;

    const engine = new ComplianceRuleEngine();
    const result = await engine.evaluateInstitution(institutionId, frameworks);

    const generator = new ComplianceReportGenerator();
    const report = generator.generate(result.findings, format);

    return NextResponse.json({
      reportId: `report_${institutionId}_${Date.now()}`,
      institutionId,
      frameworksEvaluated: result.frameworksEvaluated,
      ...report,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = requireAuth(handler, 'compliance:manage');