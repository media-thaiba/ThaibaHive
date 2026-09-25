import { AlumniDbStore } from '../../../db/alumni-store';
import { JobBoardEngine } from '../../operations/alumni/jobs/job-board-engine';

describe('Alumni Job Board & Employer Vetting Engine (Sprint-058 - ALUM-007)', () => {
  let store: AlumniDbStore;
  let engine: JobBoardEngine;
  const instId = 'inst_campus_jobs';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new JobBoardEngine(store);
  });

  it('should create a job posting in pending review and publish after moderation', async () => {
    const job = await engine.createJobPosting({
      institutionId: instId,
      company: 'Neural Edge Labs',
      title: 'Robotics Software Intern',
      roleType: 'internship',
      workplaceType: 'hybrid',
      location: 'Bangalore, India',
      departmentTarget: 'Robotics & Automation',
      minSalary: 40000,
      maxSalary: 60000,
      description: 'Building ROS2 motion planning algorithms',
      requirements: 'C++, Python, ROS2 experience',
      skillsRequired: ['C++', 'ROS2', 'SLAM'],
      hasAlumniReferral: true,
    });

    expect(job.status).toBe('pending_review');

    // Moderate and publish
    const publishedJob = await engine.moderateJobPosting(
      job.id,
      instId,
      'publish',
      'staff_placement_officer',
      'Approved for batch 2026'
    );
    expect(publishedJob.status).toBe('published');
    expect(publishedJob.publishedAt).toBeDefined();

    // Student listing query
    const studentJobs = await engine.listActiveJobsForStudents({
      institutionId: instId,
      department: 'Robotics & Automation',
    });
    expect(studentJobs.length).toBe(1);
    expect(studentJobs[0].title).toBe('Robotics Software Intern');
  });
});
