import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniJobApplicationItem,
  JobApplicationStatus,
} from '../types';
import { computePlacementAnalytics, PlacementAnalyticsSummary } from './placement-analytics';

export interface SubmitApplicationInput {
  jobPostingId: string;
  studentId: string;
  resumeUrl: string;
  coverLetter?: string | null;
  portfolioLink?: string | null;
  referralEndorsedById?: string | null;
  referralNotes?: string | null;
}

export class JobApplicationEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public async submitApplication(input: SubmitApplicationInput): Promise<AlumniJobApplicationItem> {
    const job = await this.store.getJobPostingById(input.jobPostingId);
    if (!job) {
      throw new Error('Job posting not found.');
    }
    if (job.status !== 'published') {
      throw new Error('Applications can only be submitted for published job postings.');
    }

    const appId = `app_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const application: AlumniJobApplicationItem = {
      id: appId,
      jobPostingId: input.jobPostingId,
      studentId: input.studentId,
      resumeUrl: input.resumeUrl,
      coverLetter: input.coverLetter,
      portfolioLink: input.portfolioLink,
      status: 'applied',
      referralEndorsedById: input.referralEndorsedById,
      referralNotes: input.referralNotes,
      appliedAt: now,
      updatedAt: now,
    };

    await this.store.createJobApplication(application);
    return application;
  }

  public async updateApplicationStatus(
    applicationId: string,
    status: JobApplicationStatus,
    recruiterFeedback?: string
  ): Promise<AlumniJobApplicationItem> {
    const app = await this.store.getJobApplicationById(applicationId);
    if (!app) {
      throw new Error('Job application not found.');
    }

    const updated = await this.store.updateJobApplication(applicationId, {
      status,
      recruiterFeedback,
    });

    return updated!;
  }

  public async getPlacementMetrics(institutionId: string): Promise<PlacementAnalyticsSummary> {
    const jobs = await this.store.listJobPostings({ institutionId });
    const allApplications: AlumniJobApplicationItem[] = [];

    for (const job of jobs) {
      const apps = await this.store.listJobApplications(job.id);
      allApplications.push(...apps);
    }

    return computePlacementAnalytics(allApplications, jobs);
  }
}

export const jobApplicationEngine = new JobApplicationEngine();
