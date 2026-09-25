import { db } from '@thaiba/db';
import { eq } from 'drizzle-orm';
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

function handleWriteError(operation: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  console.warn(`[AlumniDbStore] DB write fallback on ${operation}:`, error instanceof Error ? error.message : error);
}

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

  private async persistEducation(education: AlumniEducationItem): Promise<void> {
    if (!db) return;
    await db.insert(alumniEducations).values({
      id: education.id,
      alumniProfileId: education.alumniProfileId,
      institutionName: education.institutionName,
      degree: education.degree,
      fieldOfStudy: education.fieldOfStudy,
      startYear: education.startYear,
      endYear: education.endYear ?? null,
      gradeCgpa: education.gradeCgpa ?? null,
      honors: education.honors ?? null,
      activities: education.activities ?? null,
      isInstitutional: education.isInstitutional,
      createdAt: education.createdAt,
      updatedAt: education.updatedAt,
    }).onConflictDoUpdate({
      target: alumniEducations.id,
      set: {
        institutionName: education.institutionName,
        degree: education.degree,
        fieldOfStudy: education.fieldOfStudy,
        startYear: education.startYear,
        endYear: education.endYear ?? null,
        gradeCgpa: education.gradeCgpa ?? null,
        honors: education.honors ?? null,
        activities: education.activities ?? null,
        isInstitutional: education.isInstitutional,
        updatedAt: education.updatedAt,
      },
    });
  }

  private async persistExperience(experience: AlumniExperienceItem): Promise<void> {
    if (!db) return;
    await db.insert(alumniExperiences).values({
      id: experience.id,
      alumniProfileId: experience.alumniProfileId,
      company: experience.company,
      title: experience.title,
      employmentType: experience.employmentType,
      industry: experience.industry,
      location: experience.location ?? null,
      startDate: experience.startDate,
      endDate: experience.endDate ?? null,
      isCurrent: experience.isCurrent,
      description: experience.description ?? null,
      skills: experience.skills ?? null,
      createdAt: experience.createdAt,
      updatedAt: experience.updatedAt,
    }).onConflictDoUpdate({
      target: alumniExperiences.id,
      set: {
        company: experience.company,
        title: experience.title,
        employmentType: experience.employmentType,
        industry: experience.industry,
        location: experience.location ?? null,
        startDate: experience.startDate,
        endDate: experience.endDate ?? null,
        isCurrent: experience.isCurrent,
        description: experience.description ?? null,
        skills: experience.skills ?? null,
        updatedAt: experience.updatedAt,
      },
    });
  }

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

    if (db) {
      try {
        await db.insert(alumniProfiles).values({
          id: profile.id,
          institutionId: profile.institutionId,
          studentId: profile.studentId ?? null,
          userId: profile.userId ?? null,
          firstName: profile.firstName,
          lastName: profile.lastName,
          maidenName: profile.maidenName ?? null,
          email: profile.email,
          phone: profile.phone ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          headline: profile.headline ?? null,
          bio: profile.bio ?? null,
          currentCompany: profile.currentCompany ?? null,
          currentDesignation: profile.currentDesignation ?? null,
          currentIndustry: profile.currentIndustry ?? null,
          currentCity: profile.currentCity ?? null,
          currentCountry: profile.currentCountry ?? null,
          linkedinUrl: profile.linkedinUrl ?? null,
          githubUrl: profile.githubUrl ?? null,
          portfolioUrl: profile.portfolioUrl ?? null,
          graduationBatchYear: profile.graduationBatchYear,
          primaryDegree: profile.primaryDegree,
          primaryDepartment: profile.primaryDepartment,
          credentialHash: profile.credentialHash ?? null,
          isVerified: profile.isVerified,
          verifiedAt: profile.verifiedAt ?? null,
          verifiedById: profile.verifiedById ?? null,
          isMentor: profile.isMentor,
          isHiring: profile.isHiring,
          privacyConsentLevel: profile.privacyConsentLevel,
          showEmail: profile.showEmail,
          showPhone: profile.showPhone,
          showLocation: profile.showLocation,
          showCompany: profile.showCompany,
          status: profile.status,
          claimedAt: profile.claimedAt ?? null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }).onConflictDoUpdate({
          target: alumniProfiles.id,
          set: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            headline: profile.headline ?? null,
            bio: profile.bio ?? null,
            currentCompany: profile.currentCompany ?? null,
            currentDesignation: profile.currentDesignation ?? null,
            currentIndustry: profile.currentIndustry ?? null,
            currentCity: profile.currentCity ?? null,
            currentCountry: profile.currentCountry ?? null,
            linkedinUrl: profile.linkedinUrl ?? null,
            githubUrl: profile.githubUrl ?? null,
            portfolioUrl: profile.portfolioUrl ?? null,
            isVerified: profile.isVerified,
            verifiedAt: profile.verifiedAt ?? null,
            verifiedById: profile.verifiedById ?? null,
            isMentor: profile.isMentor,
            isHiring: profile.isHiring,
            privacyConsentLevel: profile.privacyConsentLevel,
            showEmail: profile.showEmail,
            showPhone: profile.showPhone,
            showLocation: profile.showLocation,
            showCompany: profile.showCompany,
            status: profile.status,
            claimedAt: profile.claimedAt ?? null,
            updatedAt: profile.updatedAt,
          },
        });

        if (profile.educations && profile.educations.length > 0) {
          for (const edu of profile.educations) {
            await this.persistEducation(edu);
          }
        }

        if (profile.experiences && profile.experiences.length > 0) {
          for (const exp of profile.experiences) {
            await this.persistExperience(exp);
          }
        }
      } catch (error) {
        handleWriteError('createAlumniProfile', error);
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

    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.firstName !== undefined) dbUpdates.firstName = updates.firstName;
        if (updates.lastName !== undefined) dbUpdates.lastName = updates.lastName;
        if (updates.maidenName !== undefined) dbUpdates.maidenName = updates.maidenName ?? null;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone ?? null;
        if (updates.avatarUrl !== undefined) dbUpdates.avatarUrl = updates.avatarUrl ?? null;
        if (updates.headline !== undefined) dbUpdates.headline = updates.headline ?? null;
        if (updates.bio !== undefined) dbUpdates.bio = updates.bio ?? null;
        if (updates.currentCompany !== undefined) dbUpdates.currentCompany = updates.currentCompany ?? null;
        if (updates.currentDesignation !== undefined) dbUpdates.currentDesignation = updates.currentDesignation ?? null;
        if (updates.currentIndustry !== undefined) dbUpdates.currentIndustry = updates.currentIndustry ?? null;
        if (updates.currentCity !== undefined) dbUpdates.currentCity = updates.currentCity ?? null;
        if (updates.currentCountry !== undefined) dbUpdates.currentCountry = updates.currentCountry ?? null;
        if (updates.linkedinUrl !== undefined) dbUpdates.linkedinUrl = updates.linkedinUrl ?? null;
        if (updates.githubUrl !== undefined) dbUpdates.githubUrl = updates.githubUrl ?? null;
        if (updates.portfolioUrl !== undefined) dbUpdates.portfolioUrl = updates.portfolioUrl ?? null;
        if (updates.isVerified !== undefined) dbUpdates.isVerified = updates.isVerified;
        if (updates.verifiedAt !== undefined) dbUpdates.verifiedAt = updates.verifiedAt ?? null;
        if (updates.verifiedById !== undefined) dbUpdates.verifiedById = updates.verifiedById ?? null;
        if (updates.isMentor !== undefined) dbUpdates.isMentor = updates.isMentor;
        if (updates.isHiring !== undefined) dbUpdates.isHiring = updates.isHiring;
        if (updates.privacyConsentLevel !== undefined) dbUpdates.privacyConsentLevel = updates.privacyConsentLevel;
        if (updates.showEmail !== undefined) dbUpdates.showEmail = updates.showEmail;
        if (updates.showPhone !== undefined) dbUpdates.showPhone = updates.showPhone;
        if (updates.showLocation !== undefined) dbUpdates.showLocation = updates.showLocation;
        if (updates.showCompany !== undefined) dbUpdates.showCompany = updates.showCompany;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.claimedAt !== undefined) dbUpdates.claimedAt = updates.claimedAt ?? null;

        await db.update(alumniProfiles).set(dbUpdates).where(eq(alumniProfiles.id, id));
      } catch (error) {
        handleWriteError('updateAlumniProfile', error);
      }
    }

    return updated;
  }

  // ─── Education & Experience Operations ───

  public async addEducation(education: AlumniEducationItem): Promise<AlumniEducationItem> {
    this.memoryStore.educations.set(education.id, { ...education });
    if (db) {
      try {
        await this.persistEducation(education);
      } catch (error) {
        handleWriteError('addEducation', error);
      }
    }
    return education;
  }

  public async addExperience(experience: AlumniExperienceItem): Promise<AlumniExperienceItem> {
    this.memoryStore.experiences.set(experience.id, { ...experience });
    if (db) {
      try {
        await this.persistExperience(experience);
      } catch (error) {
        handleWriteError('addExperience', error);
      }
    }
    return experience;
  }

  // ─── Mentorship Profile & Matching Operations ───

  public async createMentorshipProfile(profile: AlumniMentorshipProfileItem): Promise<AlumniMentorshipProfileItem> {
    this.memoryStore.mentorshipProfiles.set(profile.id, { ...profile });
    if (db) {
      try {
        await db.insert(alumniMentorshipProfiles).values({
          id: profile.id,
          alumniProfileId: profile.alumniProfileId,
          institutionId: profile.institutionId,
          expertiseAreas: profile.expertiseAreas,
          targetMenteeTypes: profile.targetMenteeTypes,
          maxActiveMentees: profile.maxActiveMentees,
          activeMenteeCount: profile.activeMenteeCount,
          preferredLanguages: profile.preferredLanguages ?? 'English',
          availabilityHoursPerMonth: profile.availabilityHoursPerMonth,
          meetingType: profile.meetingType,
          meetingLink: profile.meetingLink ?? null,
          bioMentor: profile.bioMentor ?? null,
          averageRating: profile.averageRating,
          totalReviewsCount: profile.totalReviewsCount,
          totalHoursDelivered: profile.totalHoursDelivered,
          isAcceptingRequests: profile.isAcceptingRequests,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }).onConflictDoUpdate({
          target: alumniMentorshipProfiles.id,
          set: {
            expertiseAreas: profile.expertiseAreas,
            targetMenteeTypes: profile.targetMenteeTypes,
            maxActiveMentees: profile.maxActiveMentees,
            activeMenteeCount: profile.activeMenteeCount,
            preferredLanguages: profile.preferredLanguages ?? 'English',
            availabilityHoursPerMonth: profile.availabilityHoursPerMonth,
            meetingType: profile.meetingType,
            meetingLink: profile.meetingLink ?? null,
            bioMentor: profile.bioMentor ?? null,
            averageRating: profile.averageRating,
            totalReviewsCount: profile.totalReviewsCount,
            totalHoursDelivered: profile.totalHoursDelivered,
            isAcceptingRequests: profile.isAcceptingRequests,
            updatedAt: profile.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createMentorshipProfile', error);
      }
    }
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
    if (db) {
      try {
        await db.insert(alumniMentorshipRequests).values({
          id: request.id,
          institutionId: request.institutionId,
          mentorshipProfileId: request.mentorshipProfileId,
          studentId: request.studentId,
          requestTopic: request.requestTopic,
          requestGoals: request.requestGoals,
          studentNotes: request.studentNotes ?? null,
          compatibilityScore: request.compatibilityScore,
          status: request.status,
          responseNotes: request.responseNotes ?? null,
          respondedAt: request.respondedAt ?? null,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createMentorshipRequest', error);
      }
    }
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
    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.responseNotes !== undefined) dbUpdates.responseNotes = updates.responseNotes ?? null;
        if (updates.respondedAt !== undefined) dbUpdates.respondedAt = updates.respondedAt ?? null;
        if (updates.compatibilityScore !== undefined) dbUpdates.compatibilityScore = updates.compatibilityScore;
        await db.update(alumniMentorshipRequests).set(dbUpdates).where(eq(alumniMentorshipRequests.id, id));
      } catch (error) {
        handleWriteError('updateMentorshipRequest', error);
      }
    }
    return updated;
  }

  public async createMentorshipSession(session: AlumniMentorshipSessionItem): Promise<AlumniMentorshipSessionItem> {
    this.memoryStore.mentorshipSessions.set(session.id, { ...session });
    if (db) {
      try {
        await db.insert(alumniMentorshipSessions).values({
          id: session.id,
          requestId: session.requestId,
          mentorshipProfileId: session.mentorshipProfileId,
          studentId: session.studentId,
          scheduledStart: session.scheduledStart,
          scheduledEnd: session.scheduledEnd,
          meetingUrl: session.meetingUrl ?? null,
          status: session.status,
          sessionNotes: session.sessionNotes ?? null,
          mentorRating: session.mentorRating ?? null,
          mentorFeedback: session.mentorFeedback ?? null,
          studentRating: session.studentRating ?? null,
          studentFeedback: session.studentFeedback ?? null,
          completedAt: session.completedAt ?? null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createMentorshipSession', error);
      }
    }
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
    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.sessionNotes !== undefined) dbUpdates.sessionNotes = updates.sessionNotes ?? null;
        if (updates.mentorRating !== undefined) dbUpdates.mentorRating = updates.mentorRating ?? null;
        if (updates.mentorFeedback !== undefined) dbUpdates.mentorFeedback = updates.mentorFeedback ?? null;
        if (updates.studentRating !== undefined) dbUpdates.studentRating = updates.studentRating ?? null;
        if (updates.studentFeedback !== undefined) dbUpdates.studentFeedback = updates.studentFeedback ?? null;
        if (updates.completedAt !== undefined) dbUpdates.completedAt = updates.completedAt ?? null;
        await db.update(alumniMentorshipSessions).set(dbUpdates).where(eq(alumniMentorshipSessions.id, id));
      } catch (error) {
        handleWriteError('updateMentorshipSession', error);
      }
    }
    return updated;
  }

  // ─── Job Postings & Applications ───

  public async createJobPosting(job: AlumniJobPostingItem): Promise<AlumniJobPostingItem> {
    this.memoryStore.jobPostings.set(job.id, { ...job });
    if (db) {
      try {
        await db.insert(alumniJobPostings).values({
          id: job.id,
          institutionId: job.institutionId,
          postedByAlumniId: job.postedByAlumniId ?? null,
          company: job.company,
          title: job.title,
          roleType: job.roleType,
          workplaceType: job.workplaceType,
          location: job.location,
          departmentTarget: job.departmentTarget ?? null,
          experienceLevel: job.experienceLevel ?? 'entry_level',
          minSalary: job.minSalary ?? null,
          maxSalary: job.maxSalary ?? null,
          salaryCurrency: job.salaryCurrency,
          description: job.description,
          requirements: job.requirements,
          skillsRequired: job.skillsRequired ?? null,
          applicationUrl: job.applicationUrl ?? null,
          contactEmail: job.contactEmail ?? null,
          allowDirectApply: job.allowDirectApply,
          hasAlumniReferral: job.hasAlumniReferral,
          status: job.status,
          moderatedById: job.moderatedById ?? null,
          moderationNotes: job.moderationNotes ?? null,
          publishedAt: job.publishedAt ?? null,
          expiresAt: job.expiresAt ?? null,
          viewsCount: job.viewsCount,
          applicationsCount: job.applicationsCount,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('createJobPosting', error);
      }
    }
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
    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.viewsCount !== undefined) dbUpdates.viewsCount = updates.viewsCount;
        if (updates.applicationsCount !== undefined) dbUpdates.applicationsCount = updates.applicationsCount;
        if (updates.moderatedById !== undefined) dbUpdates.moderatedById = updates.moderatedById ?? null;
        if (updates.moderationNotes !== undefined) dbUpdates.moderationNotes = updates.moderationNotes ?? null;
        if (updates.publishedAt !== undefined) dbUpdates.publishedAt = updates.publishedAt ?? null;
        if (updates.expiresAt !== undefined) dbUpdates.expiresAt = updates.expiresAt ?? null;
        await db.update(alumniJobPostings).set(dbUpdates).where(eq(alumniJobPostings.id, id));
      } catch (error) {
        handleWriteError('updateJobPosting', error);
      }
    }
    return updated;
  }

  public async createJobApplication(app: AlumniJobApplicationItem): Promise<AlumniJobApplicationItem> {
    this.memoryStore.jobApplications.set(app.id, { ...app });
    const job = this.memoryStore.jobPostings.get(app.jobPostingId);
    if (job) {
      job.applicationsCount += 1;
      this.memoryStore.jobPostings.set(job.id, job);
    }
    if (db) {
      try {
        await db.insert(alumniJobApplications).values({
          id: app.id,
          jobPostingId: app.jobPostingId,
          studentId: app.studentId,
          resumeUrl: app.resumeUrl,
          coverLetter: app.coverLetter ?? null,
          portfolioLink: app.portfolioLink ?? null,
          status: app.status,
          referralEndorsedById: app.referralEndorsedById ?? null,
          referralNotes: app.referralNotes ?? null,
          recruiterFeedback: app.recruiterFeedback ?? null,
          appliedAt: app.appliedAt,
          updatedAt: app.updatedAt,
        }).onConflictDoNothing();

        if (job) {
          await db.update(alumniJobPostings).set({
            applicationsCount: job.applicationsCount,
            updatedAt: new Date().toISOString(),
          }).where(eq(alumniJobPostings.id, job.id));
        }
      } catch (error) {
        handleWriteError('createJobApplication', error);
      }
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
    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.referralEndorsedById !== undefined) dbUpdates.referralEndorsedById = updates.referralEndorsedById ?? null;
        if (updates.referralNotes !== undefined) dbUpdates.referralNotes = updates.referralNotes ?? null;
        if (updates.recruiterFeedback !== undefined) dbUpdates.recruiterFeedback = updates.recruiterFeedback ?? null;
        await db.update(alumniJobApplications).set(dbUpdates).where(eq(alumniJobApplications.id, id));
      } catch (error) {
        handleWriteError('updateJobApplication', error);
      }
    }
    return updated;
  }

  // ─── Campaigns & Donations ───

  public async createDonationCampaign(campaign: AlumniDonationCampaignItem): Promise<AlumniDonationCampaignItem> {
    this.memoryStore.donationCampaigns.set(campaign.id, { ...campaign });
    if (db) {
      try {
        await db.insert(alumniDonationCampaigns).values({
          id: campaign.id,
          institutionId: campaign.institutionId,
          title: campaign.title,
          code: campaign.code,
          category: campaign.category,
          description: campaign.description,
          targetAmount: campaign.targetAmount,
          raisedAmount: campaign.raisedAmount,
          donorCount: campaign.donorCount,
          bannerImageUrl: campaign.bannerImageUrl ?? null,
          startDate: campaign.startDate,
          endDate: campaign.endDate ?? null,
          status: campaign.status,
          isTaxExempt80G: campaign.isTaxExempt80G,
          matchingDonorName: campaign.matchingDonorName ?? null,
          matchingRatio: campaign.matchingRatio ?? 1.0,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        }).onConflictDoUpdate({
          target: alumniDonationCampaigns.id,
          set: {
            title: campaign.title,
            category: campaign.category,
            description: campaign.description,
            targetAmount: campaign.targetAmount,
            raisedAmount: campaign.raisedAmount,
            donorCount: campaign.donorCount,
            bannerImageUrl: campaign.bannerImageUrl ?? null,
            startDate: campaign.startDate,
            endDate: campaign.endDate ?? null,
            status: campaign.status,
            isTaxExempt80G: campaign.isTaxExempt80G,
            matchingDonorName: campaign.matchingDonorName ?? null,
            matchingRatio: campaign.matchingRatio ?? 1.0,
            updatedAt: campaign.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createDonationCampaign', error);
      }
    }
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
    if (db) {
      try {
        await db.insert(alumniDonations).values({
          id: donation.id,
          institutionId: donation.institutionId,
          campaignId: donation.campaignId,
          alumniProfileId: donation.alumniProfileId ?? null,
          donorName: donation.donorName,
          donorEmail: donation.donorEmail,
          donorPhone: donation.donorPhone ?? null,
          donorPanTaxId: donation.donorPanTaxId ?? null,
          isAnonymous: donation.isAnonymous,
          amount: donation.amount,
          currency: donation.currency,
          paymentGateway: donation.paymentGateway,
          gatewayTransactionId: donation.gatewayTransactionId ?? null,
          status: donation.status,
          glJournalId: donation.glJournalId ?? null,
          receipt80GNumber: donation.receipt80GNumber ?? null,
          receipt80GHash: donation.receipt80GHash ?? null,
          receipt80GPdfUrl: donation.receipt80GPdfUrl ?? null,
          recognitionTier: donation.recognitionTier,
          isCorporateMatching: donation.isCorporateMatching,
          corporateEmployerName: donation.corporateEmployerName ?? null,
          confirmedAt: donation.confirmedAt ?? null,
          createdAt: donation.createdAt,
        }).onConflictDoNothing();

        if (campaign && donation.status === 'confirmed') {
          await db.update(alumniDonationCampaigns).set({
            raisedAmount: campaign.raisedAmount,
            donorCount: campaign.donorCount,
            updatedAt: new Date().toISOString(),
          }).where(eq(alumniDonationCampaigns.id, campaign.id));
        }
      } catch (error) {
        handleWriteError('createDonation', error);
      }
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
    if (db) {
      try {
        await db.insert(alumniChapters).values({
          id: chapter.id,
          institutionId: chapter.institutionId,
          name: chapter.name,
          code: chapter.code,
          type: chapter.type,
          country: chapter.country,
          city: chapter.city,
          description: chapter.description ?? null,
          presidentAlumniId: chapter.presidentAlumniId ?? null,
          secretaryAlumniId: chapter.secretaryAlumniId ?? null,
          treasurerAlumniId: chapter.treasurerAlumniId ?? null,
          memberCount: chapter.memberCount,
          status: chapter.status,
          bannerUrl: chapter.bannerUrl ?? null,
          foundedDate: chapter.foundedDate ?? null,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
        }).onConflictDoUpdate({
          target: alumniChapters.id,
          set: {
            name: chapter.name,
            type: chapter.type,
            country: chapter.country,
            city: chapter.city,
            description: chapter.description ?? null,
            presidentAlumniId: chapter.presidentAlumniId ?? null,
            secretaryAlumniId: chapter.secretaryAlumniId ?? null,
            treasurerAlumniId: chapter.treasurerAlumniId ?? null,
            memberCount: chapter.memberCount,
            status: chapter.status,
            bannerUrl: chapter.bannerUrl ?? null,
            foundedDate: chapter.foundedDate ?? null,
            updatedAt: chapter.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createChapter', error);
      }
    }
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
    if (db) {
      try {
        await db.insert(alumniChapterMembers).values({
          id: member.id,
          chapterId: member.chapterId,
          alumniProfileId: member.alumniProfileId,
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt,
          createdAt: member.createdAt,
        }).onConflictDoNothing();

        if (chapter) {
          await db.update(alumniChapters).set({
            memberCount: chapter.memberCount,
            updatedAt: new Date().toISOString(),
          }).where(eq(alumniChapters.id, chapter.id));
        }
      } catch (error) {
        handleWriteError('addChapterMember', error);
      }
    }
    return member;
  }

  public async createEvent(event: AlumniEventItem): Promise<AlumniEventItem> {
    this.memoryStore.events.set(event.id, { ...event });
    if (db) {
      try {
        await db.insert(alumniEvents).values({
          id: event.id,
          institutionId: event.institutionId,
          chapterId: event.chapterId ?? null,
          title: event.title,
          eventType: event.eventType,
          format: event.format,
          venue: event.venue ?? null,
          virtualMeetingUrl: event.virtualMeetingUrl ?? null,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          description: event.description,
          bannerUrl: event.bannerUrl ?? null,
          ticketPrice: event.ticketPrice,
          currency: event.currency,
          capacity: event.capacity,
          registeredCount: event.registeredCount,
          attendedCount: event.attendedCount,
          status: event.status,
          organizerAlumniId: event.organizerAlumniId ?? null,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        }).onConflictDoUpdate({
          target: alumniEvents.id,
          set: {
            title: event.title,
            eventType: event.eventType,
            format: event.format,
            venue: event.venue ?? null,
            virtualMeetingUrl: event.virtualMeetingUrl ?? null,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            description: event.description,
            bannerUrl: event.bannerUrl ?? null,
            ticketPrice: event.ticketPrice,
            currency: event.currency,
            capacity: event.capacity,
            registeredCount: event.registeredCount,
            attendedCount: event.attendedCount,
            status: event.status,
            organizerAlumniId: event.organizerAlumniId ?? null,
            updatedAt: event.updatedAt,
          },
        });
      } catch (error) {
        handleWriteError('createEvent', error);
      }
    }
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
    if (db) {
      try {
        await db.insert(alumniEventRsvps).values({
          id: rsvp.id,
          eventId: rsvp.eventId,
          alumniProfileId: rsvp.alumniProfileId ?? null,
          studentId: rsvp.studentId ?? null,
          attendeeName: rsvp.attendeeName,
          attendeeEmail: rsvp.attendeeEmail,
          ticketNumber: rsvp.ticketNumber,
          ticketPassQr: rsvp.ticketPassQr,
          ticketPassHash: rsvp.ticketPassHash,
          paymentStatus: rsvp.paymentStatus,
          amountPaid: rsvp.amountPaid,
          isCheckedIn: rsvp.isCheckedIn,
          checkedInAt: rsvp.checkedInAt ?? null,
          checkedInById: rsvp.checkedInById ?? null,
          rsvpStatus: rsvp.rsvpStatus,
          createdAt: rsvp.createdAt,
          updatedAt: rsvp.updatedAt,
        }).onConflictDoNothing();

        if (event) {
          await db.update(alumniEvents).set({
            registeredCount: event.registeredCount,
            updatedAt: new Date().toISOString(),
          }).where(eq(alumniEvents.id, event.id));
        }
      } catch (error) {
        handleWriteError('createEventRsvp', error);
      }
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
    let eventToUpdate: AlumniEventItem | undefined;
    if (updates.isCheckedIn && !existing.isCheckedIn) {
      const event = this.memoryStore.events.get(existing.eventId);
      if (event) {
        event.attendedCount += 1;
        this.memoryStore.events.set(event.id, event);
        eventToUpdate = event;
      }
    }
    if (db) {
      try {
        const dbUpdates: Record<string, unknown> = { updatedAt: updated.updatedAt };
        if (updates.isCheckedIn !== undefined) dbUpdates.isCheckedIn = updates.isCheckedIn;
        if (updates.checkedInAt !== undefined) dbUpdates.checkedInAt = updates.checkedInAt ?? null;
        if (updates.checkedInById !== undefined) dbUpdates.checkedInById = updates.checkedInById ?? null;
        if (updates.rsvpStatus !== undefined) dbUpdates.rsvpStatus = updates.rsvpStatus;
        if (updates.paymentStatus !== undefined) dbUpdates.paymentStatus = updates.paymentStatus;
        if (updates.amountPaid !== undefined) dbUpdates.amountPaid = updates.amountPaid;

        await db.update(alumniEventRsvps).set(dbUpdates).where(eq(alumniEventRsvps.id, id));

        if (eventToUpdate) {
          await db.update(alumniEvents).set({
            attendedCount: eventToUpdate.attendedCount,
            updatedAt: new Date().toISOString(),
          }).where(eq(alumniEvents.id, eventToUpdate.id));
        }
      } catch (error) {
        handleWriteError('updateEventRsvp', error);
      }
    }
    return updated;
  }

  // ─── Audit Log Operations ───

  public async logAudit(audit: AlumniAuditLogItem): Promise<AlumniAuditLogItem> {
    this.memoryStore.auditLogs.set(audit.id, { ...audit });
    if (db) {
      try {
        await db.insert(alumniAuditLogs).values({
          id: audit.id,
          auditId: audit.auditId,
          institutionId: audit.institutionId,
          actorId: audit.actorId,
          actorRole: audit.actorRole,
          action: audit.action,
          entityType: audit.entityType,
          entityId: audit.entityId,
          payloadHash: audit.payloadHash,
          timestamp: audit.timestamp,
          createdAt: audit.createdAt,
        }).onConflictDoNothing();
      } catch (error) {
        handleWriteError('logAudit', error);
      }
    }
    return audit;
  }

  public async listAuditLogs(institutionId: string): Promise<AlumniAuditLogItem[]> {
    return Array.from(this.memoryStore.auditLogs.values()).filter(
      (a) => a.institutionId === institutionId
    );
  }
}

export const alumniStore = AlumniDbStore.getInstance();
