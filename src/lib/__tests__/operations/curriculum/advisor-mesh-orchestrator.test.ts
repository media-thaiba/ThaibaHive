import { advisorMesh } from '../../../operations/curriculum/advising/advisor-mesh-orchestrator';
import { StudentAcademicProfile } from '../../../operations/curriculum/advising/advising-types';

describe('Multi-Agent Advisor Orchestrator & Intent Routing (ADVISE-005)', () => {
  const mockProfile: StudentAcademicProfile = {
    studentId: 'stud_123',
    majorProgramCode: 'CS_BS',
    declaredCatalogYear: '2026-2027',
    cumulativeGpa: 3.45,
    majorGpa: 3.60,
    totalCompletedCredits: 64,
    termStanding: 4,
    academicStanding: 'good_standing',
    passedCourses: [{ courseCode: 'CS101', grade: 'A', credits: 4 }],
    inProgressCourses: ['CS102', 'MATH101'],
    institutionId: 'inst_alpha',
  };

  it('should route degree planning questions to DegreePlannerAgent', async () => {
    const response = await advisorMesh.handleDialogue(
      'What is my degree roadmap for next term and when do I graduate?',
      mockProfile
    );

    expect(response.agentDomain).toBe('degree_planner');
    expect(response.agentName).toBe('Degree Planner Agent');
    expect(response.replyText).toContain('CS_BS');
    expect(response.confidence).toBeGreaterThan(0.85);
  });

  it('should route career and specialization queries to CareerAlignmentAgent', async () => {
    const response = await advisorMesh.handleDialogue(
      'What electives should I choose if I want a career as a machine learning engineer?',
      mockProfile
    );

    expect(response.agentDomain).toBe('career_alignment');
    expect(response.agentName).toBe('Career Alignment Agent');
    expect(response.replyText).toContain('Artificial Intelligence');
  });

  it('should route transfer credit questions to TransferArticulationAgent', async () => {
    const response = await advisorMesh.handleDialogue(
      'How do I transfer prior credits from my community college for CS101?',
      mockProfile
    );

    expect(response.agentDomain).toBe('transfer_articulation');
    expect(response.agentName).toBe('Transfer Articulation Agent');
    expect(response.replyText).toContain('transfer');
  });

  it('should route credit load questions to FinancialAidLoadAgent', async () => {
    const response = await advisorMesh.handleDialogue(
      'Is 19 credits an overload and will taking fewer than 12 credits impact my scholarship?',
      mockProfile
    );

    expect(response.agentDomain).toBe('financial_aid_load');
    expect(response.agentName).toBe('Financial Aid & Credit Load Agent');
    expect(response.replyText).toContain('12 credits');
  });

  it('should route probation and grade recovery questions to AcademicRecoveryAgent', async () => {
    const response = await advisorMesh.handleDialogue(
      'I am on academic probation after failing Calculus. What is the retake and grade replacement policy?',
      { ...mockProfile, cumulativeGpa: 1.85, academicStanding: 'academic_probation' }
    );

    expect(response.agentDomain).toBe('academic_recovery');
    expect(response.agentName).toBe('Academic Recovery & Probation Agent');
    expect(response.replyText).toContain('Repeat Forgiveness Policy');
  });
});
