import { DegreePlannerAgent } from '../../../operations/curriculum/advising/agents/degree-planner-agent';
import { CareerAlignmentAgent } from '../../../operations/curriculum/advising/agents/career-alignment-agent';
import { TransferArticulationAgent } from '../../../operations/curriculum/advising/agents/transfer-articulation-agent';
import { FinancialAidLoadAgent } from '../../../operations/curriculum/advising/agents/financial-aid-load-agent';
import { AcademicRecoveryAgent } from '../../../operations/curriculum/advising/agents/academic-recovery-agent';
import { StudentAcademicProfile } from '../../../operations/curriculum/advising/advising-types';

describe('Specialized Academic Advisor Domain Agents (ADVISE-006)', () => {
  const mockProfile: StudentAcademicProfile = {
    studentId: 'stud_999',
    majorProgramCode: 'SE_BS',
    declaredCatalogYear: '2026-2027',
    cumulativeGpa: 3.20,
    majorGpa: 3.35,
    totalCompletedCredits: 45,
    termStanding: 3,
    academicStanding: 'good_standing',
    passedCourses: [],
    inProgressCourses: [],
    institutionId: 'inst_1',
  };

  it('DegreePlannerAgent generates valid roadmap recommendations', async () => {
    const agent = new DegreePlannerAgent();
    const result = await agent.evaluate('Can you add CS201 to my plan?', mockProfile, {
      domain: 'degree_planner',
      confidence: 0.95,
      extractedEntities: { courseCodes: ['CS201'] },
      rationale: '',
    });

    expect(result.proposedRoadmapAction).toBeDefined();
    expect(result.proposedRoadmapAction?.courseCode).toBe('CS201');
    expect(result.citations).toHaveLength(1);
  });

  it('CareerAlignmentAgent provides targeted technical track electives', async () => {
    const agent = new CareerAlignmentAgent();
    const result = await agent.evaluate('I want to work in Cybersecurity', mockProfile, {
      domain: 'career_alignment',
      confidence: 0.9,
      extractedEntities: {},
      rationale: '',
    });

    expect(result.replyText).toContain('Cybersecurity');
    expect(result.proposedRoadmapAction?.courseCode).toBe('CS450');
  });

  it('TransferArticulationAgent provides policy bounds and waiver pathways', async () => {
    const agent = new TransferArticulationAgent();
    const result = await agent.evaluate('Transfer Math credits', mockProfile, {
      domain: 'transfer_articulation',
      confidence: 0.9,
      extractedEntities: { courseCodes: ['MATH101'] },
      rationale: '',
    });

    expect(result.replyText).toContain('MATH101');
    expect(result.citations[0].excerpt).toContain('60 lower-division');
  });

  it('FinancialAidLoadAgent evaluates credit thresholds', async () => {
    const agent = new FinancialAidLoadAgent();
    const result = await agent.evaluate('How many credits to remain full-time?', mockProfile, {
      domain: 'financial_aid_load',
      confidence: 0.95,
      extractedEntities: {},
      rationale: '',
    });

    expect(result.replyText).toContain('12 credits/term');
    expect(result.replyText).toContain('18 credits');
  });

  it('AcademicRecoveryAgent constructs probation rehabilitation schedule', async () => {
    const agent = new AcademicRecoveryAgent();
    const result = await agent.evaluate('Help me recover my low GPA after failing CS102', { ...mockProfile, cumulativeGpa: 1.75, academicStanding: 'academic_probation' }, {
      domain: 'academic_recovery',
      confidence: 0.95,
      extractedEntities: { courseCodes: ['CS102'] },
      rationale: '',
    });

    expect(result.replyText).toContain('Repeat Forgiveness Policy');
    expect(result.proposedRoadmapAction?.courseCode).toBe('CS102');
  });
});
