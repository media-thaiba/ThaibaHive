import { curriculumStore } from '../../db/curriculum-store';

describe('Curriculum Store Data Access Layer (Sprint-051 ADVISE-MESH)', () => {
  beforeEach(() => {
    curriculumStore.clearMemoryStore();
  });

  it('should create and retrieve programs with tenant isolation', async () => {
    const prog1 = await curriculumStore.createProgram({
      programCode: 'CS_BS',
      title: 'Bachelor of Science in Computer Science',
      totalCreditsRequired: 120,
      minimumGpa: 2.5,
      institutionId: 'inst_alpha',
    });

    const prog2 = await curriculumStore.createProgram({
      programCode: 'EE_BS',
      title: 'Bachelor of Science in Electrical Engineering',
      totalCreditsRequired: 128,
      institutionId: 'inst_beta',
    });

    const fetchedAlpha = await curriculumStore.getProgramById('CS_BS', 'inst_alpha');
    expect(fetchedAlpha).toBeDefined();
    expect(fetchedAlpha?.title).toBe('Bachelor of Science in Computer Science');

    // Tenant isolation check
    const fetchedCrossTenant = await curriculumStore.getProgramById('CS_BS', 'inst_beta');
    expect(fetchedCrossTenant).toBeNull();

    const listBeta = await curriculumStore.listPrograms('inst_beta');
    expect(listBeta).toHaveLength(1);
    expect(listBeta[0].programCode).toBe('EE_BS');
  });

  it('should create courses and manage prerequisite relations', async () => {
    const cs101 = await curriculumStore.createCourse({
      courseCode: 'CS101',
      title: 'Intro to Programming',
      credits: 4,
      level: 100,
      institutionId: 'inst_alpha',
    });

    const cs102 = await curriculumStore.createCourse({
      courseCode: 'CS102',
      title: 'Data Structures',
      credits: 4,
      level: 100,
      institutionId: 'inst_alpha',
    });

    const prereq = await curriculumStore.addPrerequisite({
      courseId: cs102.id,
      prerequisiteCourseId: cs101.id,
      type: 'hard_prerequisite',
      minimumGrade: 'C',
      institutionId: 'inst_alpha',
    });

    expect(prereq).toBeDefined();
    const prereqsFor102 = await curriculumStore.getPrerequisitesForCourse(cs102.id, 'inst_alpha');
    expect(prereqsFor102).toHaveLength(1);
    expect(prereqsFor102[0].prerequisiteCourseId).toBe(cs101.id);
  });

  it('should manage student degree plans and plan courses', async () => {
    const plan = await curriculumStore.createDegreePlan({
      planId: 'plan_001',
      studentId: 'student_123',
      programId: 'CS_BS',
      title: 'Four Year Degree Roadmap',
      institutionId: 'inst_alpha',
    });

    await curriculumStore.setPlanCourses(
      plan.planId,
      [
        { courseId: 'crs_cs101', plannedTermIndex: 1, termName: 'Year 1 Fall', credits: 4 },
        { courseId: 'crs_math101', plannedTermIndex: 1, termName: 'Year 1 Fall', credits: 4 },
        { courseId: 'crs_cs102', plannedTermIndex: 2, termName: 'Year 1 Spring', credits: 4 },
      ],
      'inst_alpha'
    );

    const fetchedPlan = await curriculumStore.getDegreePlan(plan.planId, 'inst_alpha');
    expect(fetchedPlan).toBeDefined();
    expect(fetchedPlan?.courses).toHaveLength(3);

    const approved = await curriculumStore.updateDegreePlanStatus(
      plan.planId,
      'approved',
      'advisor_999',
      'merkle_hash_abc123',
      'inst_alpha'
    );
    expect(approved?.status).toBe('approved');
    expect(approved?.approvedByAdvisorId).toBe('advisor_999');
    expect(approved?.merkleAuditHash).toBe('merkle_hash_abc123');
  });

  it('should create advising sessions and append conversational messages', async () => {
    const session = await curriculumStore.createAdvisingSession({
      sessionId: 'sess_001',
      studentId: 'student_123',
      activeDomain: 'degree_planner',
      institutionId: 'inst_alpha',
    });

    await curriculumStore.addAdvisingMessage({
      sessionId: session.sessionId,
      senderType: 'student',
      messageContent: 'Can I take CS102 and Algorithms in the same term?',
      institutionId: 'inst_alpha',
    });

    await curriculumStore.addAdvisingMessage({
      sessionId: session.sessionId,
      senderType: 'agent',
      agentDomain: 'degree_planner',
      messageContent: 'CS102 is a prerequisite for Algorithms, so they should be taken sequentially.',
      institutionId: 'inst_alpha',
    });

    const messages = await curriculumStore.getAdvisingMessages(session.sessionId, 'inst_alpha');
    expect(messages).toHaveLength(2);
    expect(messages[0].senderType).toBe('student');
    expect(messages[1].agentDomain).toBe('degree_planner');
  });

  it('should record retention alerts and manage triage lifecycle', async () => {
    const alert = await curriculumStore.createRetentionAlert({
      alertId: 'ret_001',
      studentId: 'student_456',
      riskTier: 'high',
      riskScore: 0.82,
      contributingFactorsJson: JSON.stringify(['Dropped Calculus I', 'Attendance below 70%']),
      institutionId: 'inst_alpha',
    });

    const list = await curriculumStore.listRetentionAlerts('inst_alpha', 'high');
    expect(list).toHaveLength(1);
    expect(list[0].riskScore).toBe(0.82);

    const updated = await curriculumStore.updateRetentionAlertStatus(
      alert.alertId,
      'in_intervention',
      'Contacted via WhatsApp, scheduled tutoring session',
      'counselor_888',
      'inst_alpha'
    );
    expect(updated?.status).toBe('in_intervention');
    expect(updated?.assignedCounselorId).toBe('counselor_888');
  });

  it('should record immutable audit logs with Merkle proofs', async () => {
    const audit = await curriculumStore.appendAuditLog({
      auditId: 'audit_001',
      actionType: 'prerequisite_waived',
      targetStudentId: 'student_123',
      performedByUserId: 'dean_777',
      actorRole: 'hod',
      justification: 'Equivalent AP Computer Science credit validated',
      merkleAuditHash: 'sha256_root_xyz',
      institutionId: 'inst_alpha',
    });

    expect(audit).toBeDefined();
    const logs = await curriculumStore.listAuditLogs('inst_alpha', 'student_123');
    expect(logs).toHaveLength(1);
    expect(logs[0].actionType).toBe('prerequisite_waived');
  });
});
