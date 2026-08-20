import { kmStore } from '@/lib/db/km-store';

describe('Knowledge Mesh DB Store (KM-001)', () => {
  beforeEach(() => {
    kmStore.clearMemoryStore();
  });

  it('should create and retrieve a knowledge entity', async () => {
    const entity = await kmStore.createEntity({
      entityId: 'ent_cs101',
      name: 'Introduction to Computer Science',
      type: 'course',
      code: 'CS-101',
      description: 'Foundational programming concepts',
      metadata: JSON.stringify({ credits: 4, department: 'CS' }),
      institutionId: 'inst_001',
    });

    expect(entity.entityId).toBe('ent_cs101');
    const fetched = await kmStore.getEntityById('ent_cs101', 'inst_001');
    expect(fetched).toBeDefined();
    expect(fetched.name).toBe('Introduction to Computer Science');

    const notFound = await kmStore.getEntityById('ent_cs101', 'inst_999');
    expect(notFound).toBeNull();
  });

  it('should create and query relations', async () => {
    await kmStore.createRelation({
      relationId: 'rel_cs101_cs201',
      sourceEntityId: 'ent_cs101',
      targetEntityId: 'ent_cs201',
      relationType: 'prerequisite_of',
      properties: JSON.stringify({ minGrade: 'C' }),
      weight: 1.0,
      institutionId: 'inst_001',
    });

    const relations = await kmStore.listRelations('inst_001', 'ent_cs101');
    expect(relations).toHaveLength(1);
    expect(relations[0].targetEntityId).toBe('ent_cs201');
  });

  it('should store documents and chunks', async () => {
    await kmStore.createDocument({
      documentId: 'doc_bylaws_2026',
      title: 'Academic Regulations 2026',
      category: 'policy',
      fileType: 'pdf',
      contentHash: 'hash_abc123',
      rawText: 'Section 1: Graduation Requirements...',
      status: 'indexed',
      institutionId: 'inst_001',
    });

    await kmStore.createChunk({
      chunkId: 'chk_bylaws_001',
      documentId: 'doc_bylaws_2026',
      chunkIndex: 0,
      content: 'Section 1: Minimum GPA for graduation is 2.0.',
      tokenCount: 10,
      institutionId: 'inst_001',
    });

    const chunks = await kmStore.listChunksByDocument('doc_bylaws_2026', 'inst_001');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('Minimum GPA');
  });

  it('should handle degree program and prerequisites queries', async () => {
    await kmStore.createDegreeProgram({
      programId: 'prog_bs_cs',
      name: 'Bachelor of Science in Computer Science',
      code: 'BS-CS',
      totalCreditsRequired: 120,
      minGpa: 2.0,
      rulesData: JSON.stringify({ coreCredits: 60, electiveCredits: 30 }),
      institutionId: 'inst_001',
    });

    await kmStore.createCoursePrerequisite({
      prereqId: 'pr_cs201',
      courseCode: 'CS-201',
      requiredCourseCode: 'CS-101',
      isHardPrerequisite: true,
      minGradeRequired: 'C',
      institutionId: 'inst_001',
    });

    const prog = await kmStore.getDegreeProgramByCode('BS-CS', 'inst_001');
    expect(prog?.totalCreditsRequired).toBe(120);

    const prereqs = await kmStore.listPrerequisitesForCourse('CS-201', 'inst_001');
    expect(prereqs).toHaveLength(1);
    expect(prereqs[0].requiredCourseCode).toBe('CS-101');
  });

  it('should handle advising interventions and translation caching', async () => {
    await kmStore.createAdvisingIntervention({
      interventionId: 'int_std_001',
      studentId: 'std_001',
      riskTier: 'advisory',
      reason: 'Low attendance in CS-201',
      recommendedActions: JSON.stringify(['Schedule tutoring', 'Meet advisor']),
      status: 'pending',
      institutionId: 'inst_001',
    });

    await kmStore.setTranslationCache({
      contentHash: 'hash_hello_ar',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
      sourceText: 'Welcome to Campus Copilot',
      translatedText: 'مرحبا بكم في المساعد الجامعي',
      provider: 'google_cloud',
      qualityScore: 0.95,
      institutionId: 'inst_001',
    });

    const interventions = await kmStore.listInterventionsByStudent('std_001', 'inst_001');
    expect(interventions).toHaveLength(1);

    const cached = await kmStore.getTranslationCache('hash_hello_ar', 'ar');
    expect(cached?.translatedText).toBe('مرحبا بكم في المساعد الجامعي');
  });
});
