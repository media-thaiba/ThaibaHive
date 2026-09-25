import { AlumniDbStore } from '../../../db/alumni-store';
import {
  GraduationTransitionEngine,
  GraduatingStudentPayload,
} from '../../operations/alumni/graduation-transition-engine';

describe('Graduation Transition Engine (Sprint-058 - ALUM-003)', () => {
  let store: AlumniDbStore;
  let engine: GraduationTransitionEngine;
  const instId = 'inst_campus_main';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new GraduationTransitionEngine(store);
  });

  it('should transition a graduating student into a verified alumni profile with credential hash', async () => {
    const student: GraduatingStudentPayload = {
      studentId: 'std_2026_001',
      institutionId: instId,
      firstName: 'Farhan',
      lastName: 'Qureshi',
      email: 'farhan.qureshi@example.com',
      phone: '+91 9876543210',
      department: 'Mechanical Engineering',
      degreeProgram: 'B.Tech Mechanical Engineering',
      graduationBatchYear: 2026,
      graduationDate: '2026-06-30',
      cgpa: '3.85',
      honors: 'First Class with Distinction',
    };

    const res = await engine.transitionGraduatingStudent(student);
    expect(res.success).toBe(true);
    expect(res.isExisting).toBe(false);
    expect(res.credentialHash).toBeDefined();

    const profile = await store.getAlumniProfileById(res.alumniProfileId, instId);
    expect(profile).not.toBeNull();
    expect(profile?.firstName).toBe('Farhan');
    expect(profile?.isVerified).toBe(true);
    expect(profile?.graduationBatchYear).toBe(2026);
    expect(profile?.educations?.length).toBe(1);
    expect(profile?.educations?.[0].honors).toBe('First Class with Distinction');
  });

  it('should execute idempotent batch transition for graduating cohort', async () => {
    const cohort: GraduatingStudentPayload[] = [
      {
        studentId: 'std_batch_1',
        institutionId: instId,
        firstName: 'Zainab',
        lastName: 'Mirza',
        email: 'zainab.mirza@example.com',
        department: 'Biotechnology',
        degreeProgram: 'B.Sc Biotechnology',
        graduationBatchYear: 2026,
        graduationDate: '2026-06-30',
      },
      {
        studentId: 'std_batch_2',
        institutionId: instId,
        firstName: 'Omar',
        lastName: 'Farooq',
        email: 'omar.farooq@example.com',
        department: 'Civil Engineering',
        degreeProgram: 'B.Tech Civil Engineering',
        graduationBatchYear: 2026,
        graduationDate: '2026-06-30',
      },
    ];

    const firstRun = await engine.batchTransitionCohort(cohort);
    expect(firstRun.processed).toBe(2);
    expect(firstRun.created).toBe(2);
    expect(firstRun.skipped).toBe(0);

    // Repeat transition on the same cohort must be idempotent
    const secondRun = await engine.batchTransitionCohort(cohort);
    expect(secondRun.processed).toBe(2);
    expect(secondRun.created).toBe(0);
    expect(secondRun.skipped).toBe(2);
  });
});
