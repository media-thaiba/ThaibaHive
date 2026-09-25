import { db } from '@thaiba/db';
import {
  alumniProfiles,
  alumniEducations,
  alumniExperiences,
  alumniMentorshipProfiles,
  alumniMentorshipRequests,
  alumniMentorshipSessions,
  alumniJobPostings,
  alumniJobApplications,
  alumniDonationCampaigns,
  alumniDonations,
  alumniChapters,
  alumniChapterMembers,
  alumniEvents,
  alumniEventRsvps,
  alumniAuditLogs,
} from '@thaiba/db/schema';
import {
  AlumniProfileItem,
  AlumniEducationItem,
  AlumniExperienceItem,
  AlumniMentorshipProfileItem,
  AlumniMentorshipRequestItem,
  AlumniMentorshipSessionItem,
  AlumniJobPostingItem,
  AlumniJobApplicationItem,
  AlumniDonationCampaignItem,
  AlumniDonationItem,
  AlumniChapterItem,
  AlumniChapterMemberItem,
  AlumniEventItem,
  AlumniEventRsvpItem,
  AlumniAuditLogItem,
} from '../lib/operations/alumni/types';

export interface InMemoryAlumniStore {
  profiles: Map<string, AlumniProfileItem>;
  educations: Map<string, AlumniEducationItem>;
  experiences: Map<string, AlumniExperienceItem>;
  mentorshipProfiles: Map<string, AlumniMentorshipProfileItem>;
  mentorshipRequests: Map<string, AlumniMentorshipRequestItem>;
  mentorshipSessions: Map<string, AlumniMentorshipSessionItem>;
  jobPostings: Map<string, AlumniJobPostingItem>;
  jobApplications: Map<string, AlumniJobApplicationItem>;
  donationCampaigns: Map<string, AlumniDonationCampaignItem>;
  donations: Map<string, AlumniDonationItem>;
  chapters: Map<string, AlumniChapterItem>;
  chapterMembers: Map<string, AlumniChapterMemberItem>;
  events: Map<string, AlumniEventItem>;
  eventRsvps: Map<string, AlumniEventRsvpItem>;
  auditLogs: Map<string, AlumniAuditLogItem>;
}

export class AlumniDbStore {
  private static instance: AlumniDbStore;
  private memoryStore: InMemoryAlumniStore = {
    profiles: new Map(),
    educations: new Map(),
    experiences: new Map(),
    mentorshipProfiles: new Map(),
    mentorshipRequests: new Map(),
    mentorshipSessions: new Map(),
    jobPostings: new Map(),
    jobApplications: new Map(),
    donationCampaigns: new Map(),
    donations: new Map(),
    chapters: new Map(),
    chapterMembers: new Map(),
    events: new Map(),
    eventRsvps: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): AlumniDbStore {
    if (!AlumniDbStore.instance) {
      AlumniDbStore.instance = new AlumniDbStore();
    }
    return AlumniDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.profiles.clear();
    this.memoryStore.educations.clear();
    this.memoryStore.experiences.clear();
    this.memoryStore.mentorshipProfiles.clear();
    this.memoryStore.mentorshipRequests.clear();
    this.memoryStore.mentorshipSessions.clear();
    this.memoryStore.jobPostings.clear();
    this.memoryStore.jobApplications.clear();
    this.memoryStore.donationCampaigns.clear();
    this.memoryStore.donations.clear();
    this.memoryStore.chapters.clear();
    this.memoryStore.chapterMembers.clear();
    this.memoryStore.events.clear();
    this.memoryStore.eventRsvps.clear();
    this.memoryStore.auditLogs.clear();
  }

  // ─── Alumni Profile Operations ───

  public async createAlumniProfile(profile: AlumniProfileItem): Promise<AlumniProfileItem> {
    this.memoryStore.profiles.set(profile.id, { ...profile });
    if (profile.educations) {
      for (const edu of profile.educations) {
        this.memoryStore.educations.set(edu.id, { ...edu });
      }
    }
    if (profile.experiences) {
      for (const exp of profile.experiences) {
        this.memoryStore.experiences.set(exp.id, { ...exp });
      }
    }
    return profile;
  }

  public async getAlumniProfileById(id: string, institutionId?: string): Promise<AlumniProfileItem | null> {
    const profile = this.memoryStore.profiles.get(id);
    if (!profile) return null;
    if (institutionId && profile.institutionId !== institutionId) return null;

    const educations = Array.from(this.memoryStore.educations.values()).filter(
      (e) => e.alumniProfileId === profile.id
    );
    const experiences = Array.from(this.memoryStore.experiences.values()).filter(
      (e) => e.alumniProfileId === profile.id
    );

    return {
      ...profile,
      educations,
      experiences,
    };
  }

  public async getAlumniProfileByEmail(email: string, institutionId?: string): Promise<AlumniProfileItem | null> {
    const profile = Array.from(this.memoryStore.profiles.values()).find(
      (p) => p.email.toLowerCase() === email.toLowerCase() && (!institutionId || p.institutionId === institutionId)
    );
    if (!profile) return null;
    return this.getAlumniProfileById(profile.id, institutionId);
  }

  public async listAlumniProfiles(params: {
    institutionId: string;
    batchYear?: number;
    department?: string;
    industry?: string;
    isMentor?: boolean;
    isHiring?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AlumniProfileItem[]; total: number }> {
    let items = Array.from(this.memoryStore.profiles.values()).filter(
      (p) => p.institutionId === params.institutionId
    );

    if (params.batchYear) {
      items = items.filter((p) => p.graduationBatchYear === params.batchYear);
    }
    if (params.department) {
      items = items.filter((p) => p.primaryDepartment.toLowerCase() === params.department!.toLowerCase());
    }
    if (params.industry) {
      items = items.filter((p) => p.currentIndustry?.toLowerCase() === params.industry!.toLowerCase());
    }
    if (params.isMentor !== undefined) {
      items = items.filter((p) => p.isMentor === params.isMentor);
    }
    if (params.isHiring !== undefined) {
      items = items.filter((p) => p.isHiring === params.isHiring);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.currentCompany && p.currentCompany.toLowerCase().includes(q))
      );
    }

    const total = items.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const paginated = items.slice(offset, offset + limit);

    return { items: paginated, total };
  }

  public async updateAlumniProfile(id: string, updates: Partial<AlumniProfileItem>): Promise<AlumniProfileItem | null> {
    const existing = this.memoryStore.profiles.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.profiles.set(id, updated);
    return updated;
  }

  // ─── Education & Experience Operations ───

  public async addEducation(education: AlumniEducationItem): Promise<AlumniEducationItem> {
    this.memoryStore.educations.set(education.id, { ...education });
    return education;
  }

  public async addExperience(experience: AlumniExperienceItem): Promise<AlumniExperienceItem> {
    this.memoryStore.experiences.set(experience.id, { ...experience });
    return experience;
  }

  // ─── Mentorship Profile & Matching Operations ───

  public async createMentorshipProfile(profile: AlumniMentorshipProfileItem): Promise<AlumniMentorshipProfileItem> {
    this.memoryStore.mentorshipProfiles.set(profile.id, { ...profile });
    return profile;
  }

  public async getMentorshipProfileById(id: string): Promise<AlumniMentorshipProfileItem | null> {
    const mentor = this.memoryStore.mentorshipProfiles.get(id);
    if (!mentor) return null;
    const alumni = await this.getAlumniProfileById(mentor.alumniProfileId);
    return {
      ...mentor,
      alumniProfile: alumni || undefined,
    };
  }

  public async getMentorshipProfileByAlumniId(alumniProfileId: string): Promise<AlumniMentorshipProfileItem | null> {
    const mentor = Array.from(this.memoryStore.mentorshipProfiles.values()).find(
      (m) => m.alumniProfileId === alumniProfileId
    );
    if (!mentor) return null;
    return this.getMentorshipProfileById(mentor.id);
  }

  public async listMentorshipProfiles(institutionId: string): Promise<AlumniMentorshipProfileItem[]> {
    const mentors = Array.from(this.memoryStore.mentorshipProfiles.values()).filter(
      (m) => m.institutionId === institutionId && m.isAcceptingRequests
    );
    const results: AlumniMentorshipProfileItem[] = [];
    for (const m of mentors) {
      const alumni = await this.getAlumniProfileById(m.alumniProfileId);
      results.push({
        ...m,
        alumniProfile: alumni || undefined,
      });
    }
    return results;
  }

  // ─── Mentorship Requests & Sessions ───

  public async createMentorshipRequest(request: AlumniMentorshipRequestItem): Promise<AlumniMentorshipRequestItem> {
    this.memoryStore.mentorshipRequests.set(request.id, { ...request });
    return request;
  }

  public async getMentorshipRequestById(id: string): Promise<AlumniMentorshipRequestItem | null> {
    return this.memoryStore.mentorshipRequests.get(id) || null;
  }

  public async updateMentorshipRequest(id: string, updates: Partial<AlumniMentorshipRequestItem>): Promise<AlumniMentorshipRequestItem | null> {
    const existing = this.memoryStore.mentorshipRequests.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.mentorshipRequests.set(id, updated);
    return updated;
  }

  public async createMentorshipSession(session: AlumniMentorshipSessionItem): Promise<AlumniMentorshipSessionItem> {
    this.memoryStore.mentorshipSessions.set(session.id, { ...session });
    return session;
  }

  public async getMentorshipSessionById(id: string): Promise<AlumniMentorshipSessionItem | null> {
    return this.memoryStore.mentorshipSessions.get(id) || null;
  }

  public async updateMentorshipSession(id: string, updates: Partial<AlumniMentorshipSessionItem>): Promise<AlumniMentorshipSessionItem | null> {
    const existing = this.memoryStore.mentorshipSessions.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.mentorshipSessions.set(id, updated);
    return updated;
  }

  // ─── Job Postings & Applications ───

  public async createJobPosting(job: AlumniJobPostingItem): Promise<AlumniJobPostingItem> {
    this.memoryStore.jobPostings.set(job.id, { ...job });
    return job;
  }

  public async getJobPostingById(id: string, institutionId?: string): Promise<AlumniJobPostingItem | null> {
    const job = this.memoryStore.jobPostings.get(id);
    if (!job) return null;
    if (institutionId && job.institutionId !== institutionId) return null;
    return job;
  }

  public async listJobPostings(params: {
    institutionId: string;
    status?: string;
    roleType?: string;
    workplaceType?: string;
    search?: string;
  }): Promise<AlumniJobPostingItem[]> {
    let items = Array.from(this.memoryStore.jobPostings.values()).filter(
      (j) => j.institutionId === params.institutionId
    );
    if (params.status) {
      items = items.filter((j) => j.status === params.status);
    }
    if (params.roleType) {
      items = items.filter((j) => j.roleType === params.roleType);
    }
    if (params.workplaceType) {
      items = items.filter((j) => j.workplaceType === params.workplaceType);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }
    return items;
  }

  public async updateJobPosting(id: string, updates: Partial<AlumniJobPostingItem>): Promise<AlumniJobPostingItem | null> {
    const existing = this.memoryStore.jobPostings.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.jobPostings.set(id, updated);
    return updated;
  }

  public async createJobApplication(app: AlumniJobApplicationItem): Promise<AlumniJobApplicationItem> {
    this.memoryStore.jobApplications.set(app.id, { ...app });
    const job = this.memoryStore.jobPostings.get(app.jobPostingId);
    if (job) {
      job.applicationsCount += 1;
      this.memoryStore.jobPostings.set(job.id, job);
    }
    return app;
  }

  public async getJobApplicationById(id: string): Promise<AlumniJobApplicationItem | null> {
    return this.memoryStore.jobApplications.get(id) || null;
  }

  public async listJobApplications(jobPostingId: string): Promise<AlumniJobApplicationItem[]> {
    return Array.from(this.memoryStore.jobApplications.values()).filter(
      (a) => a.jobPostingId === jobPostingId
    );
  }

  public async updateJobApplication(id: string, updates: Partial<AlumniJobApplicationItem>): Promise<AlumniJobApplicationItem | null> {
    const existing = this.memoryStore.jobApplications.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.jobApplications.set(id, updated);
    return updated;
  }

  // ─── Campaigns & Donations ───

  public async createDonationCampaign(campaign: AlumniDonationCampaignItem): Promise<AlumniDonationCampaignItem> {
    this.memoryStore.donationCampaigns.set(campaign.id, { ...campaign });
    return campaign;
  }

  public async getDonationCampaignById(id: string, institutionId?: string): Promise<AlumniDonationCampaignItem | null> {
    const campaign = this.memoryStore.donationCampaigns.get(id);
    if (!campaign) return null;
    if (institutionId && campaign.institutionId !== institutionId) return null;
    return campaign;
  }

  public async listDonationCampaigns(institutionId: string): Promise<AlumniDonationCampaignItem[]> {
    return Array.from(this.memoryStore.donationCampaigns.values()).filter(
      (c) => c.institutionId === institutionId
    );
  }

  public async createDonation(donation: AlumniDonationItem): Promise<AlumniDonationItem> {
    this.memoryStore.donations.set(donation.id, { ...donation });
    const campaign = this.memoryStore.donationCampaigns.get(donation.campaignId);
    if (campaign && donation.status === 'confirmed') {
      campaign.raisedAmount += donation.amount;
      campaign.donorCount += 1;
      this.memoryStore.donationCampaigns.set(campaign.id, campaign);
    }
    return donation;
  }

  public async getDonationById(id: string, institutionId?: string): Promise<AlumniDonationItem | null> {
    const donation = this.memoryStore.donations.get(id);
    if (!donation) return null;
    if (institutionId && donation.institutionId !== institutionId) return null;
    return donation;
  }

  public async getDonationByReceiptHash(receiptHash: string): Promise<AlumniDonationItem | null> {
    return Array.from(this.memoryStore.donations.values()).find(
      (d) => d.receipt80GHash === receiptHash
    ) || null;
  }

  public async listDonations(params: {
    institutionId: string;
    campaignId?: string;
    alumniProfileId?: string;
  }): Promise<AlumniDonationItem[]> {
    let items = Array.from(this.memoryStore.donations.values()).filter(
      (d) => d.institutionId === params.institutionId
    );
    if (params.campaignId) {
      items = items.filter((d) => d.campaignId === params.campaignId);
    }
    if (params.alumniProfileId) {
      items = items.filter((d) => d.alumniProfileId === params.alumniProfileId);
    }
    return items;
  }

  // ─── Chapters & Events ───

  public async createChapter(chapter: AlumniChapterItem): Promise<AlumniChapterItem> {
    this.memoryStore.chapters.set(chapter.id, { ...chapter });
    return chapter;
  }

  public async getChapterById(id: string, institutionId?: string): Promise<AlumniChapterItem | null> {
    const chapter = this.memoryStore.chapters.get(id);
    if (!chapter) return null;
    if (institutionId && chapter.institutionId !== institutionId) return null;
    return chapter;
  }

  public async listChapters(institutionId: string): Promise<AlumniChapterItem[]> {
    return Array.from(this.memoryStore.chapters.values()).filter(
      (c) => c.institutionId === institutionId
    );
  }

  public async addChapterMember(member: AlumniChapterMemberItem): Promise<AlumniChapterMemberItem> {
    this.memoryStore.chapterMembers.set(member.id, { ...member });
    const chapter = this.memoryStore.chapters.get(member.chapterId);
    if (chapter) {
      chapter.memberCount += 1;
      this.memoryStore.chapters.set(chapter.id, chapter);
    }
    return member;
  }

  public async createEvent(event: AlumniEventItem): Promise<AlumniEventItem> {
    this.memoryStore.events.set(event.id, { ...event });
    return event;
  }

  public async getEventById(id: string, institutionId?: string): Promise<AlumniEventItem | null> {
    const event = this.memoryStore.events.get(id);
    if (!event) return null;
    if (institutionId && event.institutionId !== institutionId) return null;
    return event;
  }

  public async listEvents(params: { institutionId: string; chapterId?: string }): Promise<AlumniEventItem[]> {
    let items = Array.from(this.memoryStore.events.values()).filter(
      (e) => e.institutionId === params.institutionId
    );
    if (params.chapterId) {
      items = items.filter((e) => e.chapterId === params.chapterId);
    }
    return items;
  }

  public async createEventRsvp(rsvp: AlumniEventRsvpItem): Promise<AlumniEventRsvpItem> {
    this.memoryStore.eventRsvps.set(rsvp.id, { ...rsvp });
    const event = this.memoryStore.events.get(rsvp.eventId);
    if (event) {
      event.registeredCount += 1;
      this.memoryStore.events.set(event.id, event);
    }
    return rsvp;
  }

  public async getEventRsvpByTicketHash(ticketHash: string): Promise<AlumniEventRsvpItem | null> {
    return Array.from(this.memoryStore.eventRsvps.values()).find(
      (r) => r.ticketPassHash === ticketHash
    ) || null;
  }

  public async updateEventRsvp(id: string, updates: Partial<AlumniEventRsvpItem>): Promise<AlumniEventRsvpItem | null> {
    const existing = this.memoryStore.eventRsvps.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.eventRsvps.set(id, updated);
    if (updates.isCheckedIn && !existing.isCheckedIn) {
      const event = this.memoryStore.events.get(existing.eventId);
      if (event) {
        event.attendedCount += 1;
        this.memoryStore.events.set(event.id, event);
      }
    }
    return updated;
  }

  // ─── Audit Log Operations ───

  public async logAudit(audit: AlumniAuditLogItem): Promise<AlumniAuditLogItem> {
    this.memoryStore.auditLogs.set(audit.id, { ...audit });
    return audit;
  }

  public async listAuditLogs(institutionId: string): Promise<AlumniAuditLogItem[]> {
    return Array.from(this.memoryStore.auditLogs.values()).filter(
      (a) => a.institutionId === institutionId
    );
  }
}

export const alumniStore = AlumniDbStore.getInstance();
