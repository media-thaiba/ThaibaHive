import { GET as getPlans, POST as createPlan, PATCH as updatePlan } from '../../../app/api/curriculum/plans/route';
import { GET as getAudit } from '../../../app/api/curriculum/audit/route';
import { GET as getTransfer, POST as handleTransfer } from '../../../app/api/curriculum/transfer/route';
import { curriculumStore } from '../../db/curriculum-store';

describe('Curriculum Plans, Audit & Transfer Routes (ADVISE-016)', () => {
  const mockUser = { id: 'advisor_1', role: 'admin', institutionId: 'inst_plan_api' };

  beforeEach(async () => {
    curriculumStore.clearMemoryStore();
    await curriculumStore.createProgram({
      programCode: 'CS_BS',
      title: 'B.S. in Computer Science',
      institutionId: 'inst_plan_api',
    });
  });

  it('should create and approve degree plans with Merkle audit hash', async () => {
    const postPlanRes = await createPlan(
      new Request('http://localhost/api/curriculum/plans', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'plan_test_1',
          studentId: 'stud_test_1',
          programId: 'CS_BS',
          title: 'Official Plan',
          institutionId: 'inst_plan_api',
        }),
      }) as any,
      mockUser as any
    );
    expect(postPlanRes.status).toBe(201);

    const approveRes = await updatePlan(
      new Request('http://localhost/api/curriculum/plans?planId=plan_test_1&tenantId=inst_plan_api', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          justification: 'Approved standard graduation pathway',
        }),
      }) as any,
      mockUser as any
    );
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json();
    expect(approveJson.plan.status).toBe('approved');
    expect(approveJson.plan.merkleAuditHash.length).toBe(64);
  });

  it('should execute degree audit via API endpoint', async () => {
    const auditRes = await getAudit(
      new Request('http://localhost/api/curriculum/audit?studentId=stud_test_1&programCode=CS_BS&tenantId=inst_plan_api') as any,
      mockUser as any
    );
    expect(auditRes.status).toBe(200);
    const auditJson = await auditRes.json();
    expect(auditJson.auditReport).toBeDefined();
    expect(auditJson.auditReport.programCode).toBe('CS_BS');
  });

  it('should parse raw OCR transcript text and return transfer recommendations', async () => {
    const rawOcr = `
    Western Tech University
    CS-101 Intro to Computer Science 4.0 A
    `;

    const transferRes = await handleTransfer(
      new Request('http://localhost/api/curriculum/transfer', {
        method: 'POST',
        body: JSON.stringify({
          rawTranscriptText: rawOcr,
        }),
      }) as any,
      mockUser as any
    );

    expect(transferRes.status).toBe(200);
    const transferJson = await transferRes.json();
    expect(transferJson.parsedTranscript.courses).toHaveLength(1);
    expect(transferJson.recommendations).toHaveLength(1);
  });
});
