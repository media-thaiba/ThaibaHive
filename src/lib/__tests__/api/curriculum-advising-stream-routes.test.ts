import { GET as getAdvising, POST as sendAdvisingMsg } from '../../../app/api/curriculum/advising/route';
import { GET as getRetention, POST as triggerRetention, PATCH as updateRetention } from '../../../app/api/curriculum/retention/route';
import { curriculumStore } from '../../db/curriculum-store';

describe('Curriculum Advising Dialogue & Retention Routes (ADVISE-017)', () => {
  const mockUser = { id: 'counselor_1', role: 'admin', institutionId: 'inst_adv_api' };

  beforeEach(() => {
    curriculumStore.clearMemoryStore();
  });

  it('should process multi-agent advising dialogue and return citations', async () => {
    const advRes = await sendAdvisingMsg(
      new Request('http://localhost/api/curriculum/advising', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'sess_api_1',
          studentId: 'stud_api_1',
          prompt: 'What are the graduation requirements for Computer Science?',
          institutionId: 'inst_adv_api',
        }),
      }) as any,
      mockUser as any
    );

    expect(advRes.status).toBe(201);
    const advJson = await advRes.json();
    expect(advJson.agentResponse.agentDomain).toBe('degree_planner');
    expect(advJson.agentResponse.citations.length).toBeGreaterThan(0);

    const getRes = await getAdvising(
      new Request('http://localhost/api/curriculum/advising?sessionId=sess_api_1&tenantId=inst_adv_api') as any,
      mockUser as any
    );
    const getJson = await getRes.json();
    expect(getJson.messages.length).toBeGreaterThanOrEqual(2); // student prompt + agent reply
  });

  it('should trigger retention risk analysis and update alert status', async () => {
    const retRes = await triggerRetention(
      new Request('http://localhost/api/curriculum/retention', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'stud_at_risk_api',
          studentName: 'Chris Doe',
          cumulativeGpa: 1.70,
          priorTermGpa: 2.80,
          courseDropCount: 2,
          attendancePercentage: 65,
        }),
      }) as any,
      mockUser as any
    );

    expect(retRes.status).toBe(201);
    const retJson = await retRes.json();
    expect(retJson.evaluation.prediction.isAtRisk).toBe(true);
    expect(retJson.evaluation.isInterventionDispatched).toBe(true);

    const alertId = retJson.evaluation.alert.alertId;

    const patchRes = await updateRetention(
      new Request(`http://localhost/api/curriculum/retention?alertId=${alertId}&tenantId=inst_adv_api`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'in_intervention',
          resolutionNotes: 'Meeting scheduled with tutoring center',
        }),
      }) as any,
      mockUser as any
    );

    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.alert.status).toBe('in_intervention');
  });
});
