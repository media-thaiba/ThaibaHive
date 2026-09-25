import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniJobPostingItem,
  JobRoleType,
  WorkplaceType,
  ExperienceLevel,
  JobStatus,
} from '../types';

export interface CreateJobPostingInput {
  institutionId: string;
  postedByAlumniId?: string | null;
  company: string;
  title: string;
  roleType?: JobRoleType;
  workplaceType?: WorkplaceType;
  location: string;
  departmentTarget?: string | null;
  experienceLevel?: ExperienceLevel;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryCurrency?: string;
  description: string;
  requirements: string;
  skillsRequired?: string[];
  applicationUrl?: string | null;
  contactEmail?: string | null;
  allowDirectApply?: boolean;
  hasAlumniReferral?: boolean;
}

export class JobBoardEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public async createJobPosting(input: CreateJobPostingInput): Promise<AlumniJobPostingItem> {
    const jobId = `job_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    // Default 60 days expiration
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const job: AlumniJobPostingItem = {
      id: jobId,
      institutionId: input.institutionId,
      postedByAlumniId: input.postedByAlumniId,
      company: input.company,
      title: input.title,
      roleType: input.roleType || 'full_time',
      workplaceType: input.workplaceType || 'onsite',
      location: input.location,
      departmentTarget: input.departmentTarget,
      experienceLevel: input.experienceLevel || 'entry_level',
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      salaryCurrency: input.salaryCurrency || 'INR',
      description: input.description,
      requirements: input.requirements,
      skillsRequired: input.skillsRequired ? JSON.stringify(input.skillsRequired) : undefined,
      applicationUrl: input.applicationUrl,
      contactEmail: input.contactEmail,
      allowDirectApply: input.allowDirectApply ?? true,
      hasAlumniReferral: input.hasAlumniReferral ?? false,
      status: 'pending_review', // Requires moderation
      publishedAt: undefined,
      expiresAt,
      viewsCount: 0,
      applicationsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createJobPosting(job);
    return job;
  }

  public async moderateJobPosting(
    jobId: string,
    institutionId: string,
    action: 'publish' | 'reject',
    moderatorId: string,
    moderationNotes?: string
  ): Promise<AlumniJobPostingItem> {
    const job = await this.store.getJobPostingById(jobId, institutionId);
    if (!job) {
      throw new Error('Job posting not found.');
    }

    const now = new Date().toISOString();
    const newStatus: JobStatus = action === 'publish' ? 'published' : 'rejected';

    const updated = await this.store.updateJobPosting(jobId, {
      status: newStatus,
      moderatedById: moderatorId,
      moderationNotes,
      publishedAt: action === 'publish' ? now : undefined,
    });

    return updated!;
  }

  public async incrementViews(jobId: string, institutionId: string): Promise<void> {
    const job = await this.store.getJobPostingById(jobId, institutionId);
    if (job) {
      await this.store.updateJobPosting(jobId, {
        viewsCount: job.viewsCount + 1,
      });
    }
  }

  public async listActiveJobsForStudents(params: {
    institutionId: string;
    department?: string;
    roleType?: string;
    workplaceType?: string;
    search?: string;
  }): Promise<AlumniJobPostingItem[]> {
    const jobs = await this.store.listJobPostings({
      institutionId: params.institutionId,
      status: 'published',
      roleType: params.roleType,
      workplaceType: params.workplaceType,
      search: params.search,
    });

    const now = new Date();
    return jobs.filter((j) => {
      // Exclude expired jobs
      if (j.expiresAt && new Date(j.expiresAt) < now) return false;
      // Department filter if specified
      if (
        params.department &&
        j.departmentTarget &&
        j.departmentTarget.toLowerCase() !== params.department.toLowerCase() &&
        j.departmentTarget.toLowerCase() !== 'all'
      ) {
        return false;
      }
      return true;
    });
  }
}

export const jobBoardEngine = new JobBoardEngine();
