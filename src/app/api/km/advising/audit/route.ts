import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmDegreeAuditSchema } from '@/lib/validation/km-schemas';
import { degreeAuditor } from '@/lib/operations/km/advising/degree-auditor';
import { academicPrivacyShield } from '@/lib/operations/km/governance/academic-privacy-shield';
import { kmAuditLogger } from '@/lib/operations/km/governance/km-audit-logger';
import { kmTelemetry } from '@/lib/operations/km/km-telemetry';

const defaultCurriculum = {
  programId: 'prog_bscs_2026',
  programCode: 'BS-CS',
  name: 'B.S. in Computer Science',
  departmentId: 'DEPT-CS',
  totalCreditsRequired: 120,
  minCumulativeGpa: 2.0,
  minMajorGpa: 2.0,
  requirementGroups: [
    {
      categoryId: 'core',
      title: 'Core Computer Science',
      requiredCredits: 20,
      mandatoryCourseCodes: ['CS-101', 'CS-102', 'CS-201', 'CS-301', 'CS-302'],
    },
    {
      categoryId: 'electives',
      title: 'Major Electives',
      requiredCredits: 12,
      mandatoryCourseCodes: [],
      electiveCourseCodes: ['CS-401', 'CS-402', 'CS-499'],
    },
  ],
};

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = kmDegreeAuditSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { studentId, transcript } = parse.data;

    // FERPA Check
    const hasAccess = academicPrivacyShield.verifyFerpaAccess(user?.id || studentId, user?.role || 'student', studentId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'FERPA Access Denied: Unauthorized to view this student record' }, { status: 403 });
    }

    const auditResult = degreeAuditor.auditStudentDegree(studentId, transcript as any, defaultCurriculum);
    kmTelemetry.trackDegreeAudit(auditResult.programCode, auditResult.isGraduationEligible);
    kmAuditLogger.logEvent('degree_audit', user?.id || studentId, { studentId, eligible: auditResult.isGraduationEligible });

    return NextResponse.json({ success: true, audit: auditResult }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Degree audit failed' }, { status: 500 });
  }
}, 'km:advising:audit');
