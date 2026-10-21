import { GET as getPrograms, POST as createProgram } from '../../../app/api/curriculum/programs/route';
import { GET as getCourses, POST as createCourse } from '../../../app/api/curriculum/courses/route';
import { GET as getPrereqs, POST as createPrereq } from '../../../app/api/curriculum/prerequisites/route';
import { GET as getPlans, POST as createPlan, PATCH as patchPlan } from '../../../app/api/curriculum/plans/route';
import { POST as postAdvising } from '../../../app/api/curriculum/advising/route';
import { POST as postTransfer } from '../../../app/api/curriculum/transfer/route';
import { POST as postRetention, PATCH as patchRetention } from '../../../app/api/curriculum/retention/route';
import { curriculumStore } from '../../db/curriculum-store';

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      userId: "usr_admin",
      staffId: "usr_admin",
      email: "admin@thaiba.edu",
      role: "super_admin",
      institutionId: "inst_curric_alpha",
      permissions: ["*"],
    }),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe('Course, Subject, Prerequisite & Syllabus Pipeline — Hardening Perfection Suite', () => {
  const mockAlphaUser = { id: 'admin_1', staffId: 'staff_1', role: 'admin', institutionId: 'inst_curric_alpha' };
  const mockBetaUser = { id: 'admin_2', staffId: 'staff_2', role: 'admin', institutionId: 'inst_curric_beta' };

  beforeEach(() => {
    curriculumStore.clearMemoryStore();
  });

  describe('1. Safe JSON Parsing Across All Mutating Endpoints', () => {
    const malformedBody = '{"brokenJson": true, ';

    it('rejects malformed JSON on POST /api/curriculum/courses with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await createCourse(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST /api/curriculum/programs with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await createProgram(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST /api/curriculum/prerequisites with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/prerequisites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await createPrereq(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST /api/curriculum/plans with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await createPlan(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on PATCH /api/curriculum/plans with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/plans?planId=plan_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await patchPlan(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST /api/curriculum/advising with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/advising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await postAdvising(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST /api/curriculum/transfer with 400', async () => {
      const req = new Request('http://localhost/api/curriculum/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const res = await postTransfer(req as any, mockAlphaUser as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('rejects malformed JSON on POST & PATCH /api/curriculum/retention with 400', async () => {
      const postReq = new Request('http://localhost/api/curriculum/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const postRes = await postRetention(postReq as any, mockAlphaUser as any);
      expect(postRes.status).toBe(400);
      expect((await postRes.json()).error).toBe('Invalid JSON payload');

      const patchReq = new Request('http://localhost/api/curriculum/retention?alertId=alert_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: malformedBody,
      });
      const patchRes = await patchRetention(patchReq as any, mockAlphaUser as any);
      expect(patchRes.status).toBe(400);
      expect((await patchRes.json()).error).toBe('Invalid JSON payload');
    });
  });

  describe('2. Course Code Collision & Multi-Tenant Scoping', () => {
    it('successfully creates a course and returns 201', async () => {
      const req = new Request('http://localhost/api/curriculum/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: 'CS201',
          title: 'Data Structures and Algorithms',
          credits: 4,
          level: 200,
          institutionId: 'inst_curric_alpha',
        }),
      });

      const res = await createCourse(req as any, mockAlphaUser as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.course.courseCode).toBe('CS201');
      expect(data.course.institutionId).toBe('inst_curric_alpha');
    });

    it('blocks duplicate courseCode within the same institution with 409 Conflict', async () => {
      // First course
      await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'MATH101',
            title: 'Calculus I',
            credits: 3,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      // Duplicate courseCode in same institution
      const duplicateRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'MATH101',
            title: 'Advanced Calculus I',
            credits: 4,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(duplicateRes.status).toBe(409);
      const data = await duplicateRes.json();
      expect(data.error).toContain('already exists');
    });

    it('permits identical courseCode in a different institution (multi-tenant boundary)', async () => {
      // Create course in Alpha
      const alphaRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'ENG101',
            title: 'Composition Alpha',
            credits: 3,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      expect(alphaRes.status).toBe(201);

      // Create course with identical code in Beta
      const betaRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'ENG101',
            title: 'Composition Beta',
            credits: 3,
            level: 100,
            institutionId: 'inst_curric_beta',
          }),
        }) as any,
        mockBetaUser as any
      );
      expect(betaRes.status).toBe(201);
      const betaData = await betaRes.json();
      expect(betaData.course.institutionId).toBe('inst_curric_beta');
    });
  });

  describe('3. Program Code Collision & Scoping', () => {
    it('blocks duplicate programCode within the same institution with 409 Conflict', async () => {
      // Create program
      await createProgram(
        new Request('http://localhost/api/curriculum/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programCode: 'BS_AI',
            title: 'B.S. in Artificial Intelligence',
            degreeType: 'bachelor',
            totalCreditsRequired: 120,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      // Duplicate programCode
      const duplicateRes = await createProgram(
        new Request('http://localhost/api/curriculum/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programCode: 'BS_AI',
            title: 'Duplicate AI Program',
            degreeType: 'bachelor',
            totalCreditsRequired: 128,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(duplicateRes.status).toBe(409);
      const data = await duplicateRes.json();
      expect(data.error).toContain('already exists');
    });

    it('permits identical programCode across different institutions', async () => {
      const alphaRes = await createProgram(
        new Request('http://localhost/api/curriculum/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programCode: 'MS_DS',
            title: 'M.S. in Data Science',
            degreeType: 'master',
            totalCreditsRequired: 36,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      expect(alphaRes.status).toBe(201);

      const betaRes = await createProgram(
        new Request('http://localhost/api/curriculum/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programCode: 'MS_DS',
            title: 'M.S. in Data Science Beta',
            degreeType: 'master',
            totalCreditsRequired: 36,
            institutionId: 'inst_curric_beta',
          }),
        }) as any,
        mockBetaUser as any
      );
      expect(betaRes.status).toBe(201);
    });
  });

  describe('4. Prerequisite Integrity & DAG Cycle Detection', () => {
    it('blocks self-prerequisite (courseId === prerequisiteCourseId) with 400 Bad Request', async () => {
      const courseRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'PHY101',
            title: 'General Physics',
            credits: 4,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course } = await courseRes.json();

      const selfPrereqRes = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            prerequisiteCourseId: course.id,
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(selfPrereqRes.status).toBe(400);
      const data = await selfPrereqRes.json();
      expect(data.error).toContain('prerequisite of itself');
    });

    it('returns 404 when either target course or prerequisite course does not exist', async () => {
      const courseRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'BIO101',
            title: 'General Biology',
            credits: 3,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course } = await courseRes.json();

      const missingPrereqRes = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            prerequisiteCourseId: 'crs_nonexistent_xyz',
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(missingPrereqRes.status).toBe(404);
      const data = await missingPrereqRes.json();
      expect(data.error).toContain('do not exist');
    });

    it('blocks duplicate prerequisite links with 409 Conflict', async () => {
      const c1Res = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'CHEM101',
            title: 'Chemistry I',
            credits: 4,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course: c1 } = await c1Res.json();

      const c2Res = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'CHEM102',
            title: 'Chemistry II',
            credits: 4,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course: c2 } = await c2Res.json();

      // First link: CHEM102 requires CHEM101
      const firstLink = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: c2.id,
            prerequisiteCourseId: c1.id,
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      expect(firstLink.status).toBe(201);

      // Duplicate link
      const dupLink = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: c2.id,
            prerequisiteCourseId: c1.id,
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      expect(dupLink.status).toBe(409);
      expect((await dupLink.json()).error).toContain('already exists');
    });

    it('detects circular prerequisite dependency cycles and blocks with 409 Conflict', async () => {
      // Create 3 courses: A, B, C
      const caRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'CYC_A',
            title: 'Cycle Course A',
            credits: 3,
            level: 100,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course: ca } = await caRes.json();

      const cbRes = await createCourse(
        new Request('http://localhost/api/curriculum/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: 'CYC_B',
            title: 'Cycle Course B',
            credits: 3,
            level: 200,
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      const { course: cb } = await cbRes.json();

      // B requires A
      const link1 = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: cb.id,
            prerequisiteCourseId: ca.id,
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );
      expect(link1.status).toBe(201);

      // Now attempt to make A require B -> Circular dependency (A -> B -> A)
      const cycleLink = await createPrereq(
        new Request('http://localhost/api/curriculum/prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: ca.id,
            prerequisiteCourseId: cb.id,
            type: 'hard_prerequisite',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(cycleLink.status).toBe(409);
      const cycleData = await cycleLink.json();
      expect(cycleData.error).toContain('circular dependency cycle detected');
      expect(cycleData.cyclePath).toBeDefined();
    });
  });

  describe('5. Degree Plan Creation & Approval Hardening', () => {
    it('returns 404 when creating a degree plan for a non-existent program', async () => {
      const planRes = await createPlan(
        new Request('http://localhost/api/curriculum/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: 'plan_test_001',
            studentId: 'std_test_001',
            programId: 'prg_nonexistent_999',
            catalogYear: '2026-2027',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(planRes.status).toBe(404);
      const data = await planRes.json();
      expect(data.error).toContain('Program');
      expect(data.error).toContain('not found');
    });

    it('returns 404 when patching / approving a non-existent degree plan', async () => {
      const patchRes = await patchPlan(
        new Request('http://localhost/api/curriculum/plans?planId=plan_ghost_888', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
            institutionId: 'inst_curric_alpha',
          }),
        }) as any,
        mockAlphaUser as any
      );

      expect(patchRes.status).toBe(404);
      const data = await patchRes.json();
      expect(data.error).toContain('Degree plan');
      expect(data.error).toContain('not found');
    });
  });
});
