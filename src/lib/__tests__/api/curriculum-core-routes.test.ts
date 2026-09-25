import { GET as getPrograms, POST as createProgram } from '../../../app/api/curriculum/programs/route';
import { GET as getCourses, POST as createCourse } from '../../../app/api/curriculum/courses/route';
import { GET as getPrereqs, POST as createPrereq } from '../../../app/api/curriculum/prerequisites/route';
import { GET as getDag } from '../../../app/api/curriculum/dag/route';
import { curriculumStore } from '../../db/curriculum-store';

describe('Curriculum Core API Routes (ADVISE-015)', () => {
  const mockUser = { id: 'admin_1', role: 'admin', institutionId: 'inst_core_api' };

  beforeEach(() => {
    curriculumStore.clearMemoryStore();
  });

  it('should create and list degree programs via API', async () => {
    const postReq = new Request('http://localhost/api/curriculum/programs', {
      method: 'POST',
      body: JSON.stringify({
        programCode: 'CS_BS',
        title: 'B.S. in Computer Science',
        degreeType: 'bachelor',
        totalCreditsRequired: 120,
        institutionId: 'inst_core_api',
      }),
    });

    const postRes = await createProgram(postReq as any, mockUser as any);
    expect(postRes.status).toBe(201);
    const postJson = await postRes.json();
    expect(postJson.program.programCode).toBe('CS_BS');

    const getReq = new Request('http://localhost/api/curriculum/programs?tenantId=inst_core_api');
    const getRes = await getPrograms(getReq as any, mockUser as any);
    const getJson = await getRes.json();
    expect(getJson.programs).toHaveLength(1);
  });

  it('should create and list courses and validate DAG without cycles', async () => {
    const c1Res = await createCourse(
      new Request('http://localhost/api/curriculum/courses', {
        method: 'POST',
        body: JSON.stringify({
          courseCode: 'CS101',
          title: 'Intro CS',
          credits: 4,
          level: 100,
          institutionId: 'inst_core_api',
        }),
      }) as any,
      mockUser as any
    );
    const c1Json = await c1Res.json();

    const c2Res = await createCourse(
      new Request('http://localhost/api/curriculum/courses', {
        method: 'POST',
        body: JSON.stringify({
          courseCode: 'CS102',
          title: 'Data Structures',
          credits: 4,
          level: 100,
          institutionId: 'inst_core_api',
        }),
      }) as any,
      mockUser as any
    );
    const c2Json = await c2Res.json();

    const prereqRes = await createPrereq(
      new Request('http://localhost/api/curriculum/prerequisites', {
        method: 'POST',
        body: JSON.stringify({
          courseId: c2Json.course.id,
          prerequisiteCourseId: c1Json.course.id,
          type: 'hard_prerequisite',
          institutionId: 'inst_core_api',
        }),
      }) as any,
      mockUser as any
    );
    expect(prereqRes.status).toBe(201);

    const dagReq = new Request('http://localhost/api/curriculum/dag?tenantId=inst_core_api&bottlenecks=true');
    const dagRes = await getDag(dagReq as any, mockUser as any);
    const dagJson = await dagRes.json();

    expect(dagJson.toposort.hasCycle).toBe(false);
    expect(dagJson.bottlenecks).toBeDefined();
  });
});
