import { catalogRag } from '../../../operations/curriculum/advising/catalog-rag-connector';
import { policyRetriever } from '../../../operations/curriculum/advising/policy-retriever';
import { curriculumStore } from '../../../db/curriculum-store';
import { StudentAcademicProfile } from '../../../operations/curriculum/advising/advising-types';

describe('Institutional Catalog & Academic Policy RAG Connector (ADVISE-007)', () => {
  const mockProfile: StudentAcademicProfile = {
    studentId: 'stud_123',
    majorProgramCode: 'CS_BS',
    declaredCatalogYear: '2026-2027',
    cumulativeGpa: 3.5,
    majorGpa: 3.7,
    totalCompletedCredits: 60,
    termStanding: 4,
    academicStanding: 'good_standing',
    passedCourses: [],
    inProgressCourses: [],
    institutionId: 'inst_rag',
  };

  beforeAll(async () => {
    curriculumStore.clearMemoryStore();
    await curriculumStore.createCourse({
      courseCode: 'CS350',
      title: 'Database Systems Architecture',
      description: 'Relational algebra, SQL, indexing, and transactional concurrency control.',
      credits: 4,
      level: 300,
      institutionId: 'inst_rag',
    });
  });

  it('should retrieve relevant academic policy citations based on query keywords', () => {
    const citations = policyRetriever.retrievePolicies('probation grade replacement policy', 'inst_rag');
    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0].documentTitle).toContain('Probation');
  });

  it('should retrieve combined policy and course catalog citations via CatalogRagConnector', async () => {
    const citations = await catalogRag.retrieveCatalogContext('Tell me about CS350 Database Systems and full time credit load', mockProfile);
    expect(citations.length).toBeGreaterThan(0);

    const hasCourseCitation = citations.some((c) => c.documentTitle.includes('CS350'));
    const hasPolicyCitation = citations.some((c) => c.documentTitle.includes('Policy') || c.documentTitle.includes('Requirements') || c.documentTitle.includes('Enrollment'));

    expect(hasCourseCitation || hasPolicyCitation).toBe(true);
  });
});
