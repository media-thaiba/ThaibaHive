import { AlumniDbStore } from '../../../db/alumni-store';
import { JobApplicationEngine } from '../../operations/alumni/jobs/job-application-engine';
import { AlumniJobPostingItem } from '../../operations/alumni/types';

describe('Job Application Engine & Placement Analytics (Sprint-058 - ALUM-008)', () => {
  let store: AlumniDbStore;
  let engine: JobApplicationEngine;
  const instId = 'inst_campus_place';

  beforeEach(async () => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new JobApplicationEngine(store);

    const job1: AlumniJobPostingItem = {
      id: 'job_dev_1',
      institutionId: instId,
      company: 'Amazon AWS',
      title: 'Cloud Support Associate',
      roleType: 'full_time',
      workplaceType: 'hybrid',
      location: 'Hyderabad, India',
      minSalary: 1000000,
      maxSalary: 1400000,
      salaryCurrency: 'INR',
      description: 'Cloud infrastructure support',
      requirements: 'Linux, Networking, AWS',
      allowDirectApply: true,
      hasAlumniReferral: true,
      status: 'published',
      viewsCount: 10,
      applicationsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createJobPosting(job1);
  });

  it('should submit an application, transition status to hired, and compute placement analytics', async () => {
    // 1. Submit Application
    const app = await engine.submitApplication({
      jobPostingId: 'job_dev_1',
      studentId: 'std_candidate_1',
      resumeUrl: 'https://cdn.thaiba.edu/resumes/std1.pdf',
      coverLetter: 'Passionate about cloud systems',
      referralEndorsedById: 'alum_referrer_01',
      referralNotes: 'High performer in distributed computing coursework',
    });
    expect(app.status).toBe('applied');

    // Verify job application count incremented
    const job = await store.getJobPostingById('job_dev_1', instId);
    expect(job?.applicationsCount).toBe(1);

    // 2. Progress status to interviewing then hired
    await engine.updateApplicationStatus(app.id, 'interviewing');
    const hiredApp = await engine.updateApplicationStatus(app.id, 'hired', 'Selected for Offer');
    expect(hiredApp.status).toBe('hired');

    // 3. Compute Metrics
    const metrics = await engine.getPlacementMetrics(instId);
    expect(metrics.totalApplications).toBe(1);
    expect(metrics.totalHired).toBe(1);
    expect(metrics.placementRatePercent).toBe(100);
    expect(metrics.averageSalaryOffer).toBe(1400000);
    expect(metrics.topHiringCompanies[0].company).toBe('Amazon AWS');
  });
});
