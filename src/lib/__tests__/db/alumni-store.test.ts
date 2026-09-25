import { AlumniDbStore } from '../../../db/alumni-store';
import {
  AlumniProfileItem,
  AlumniMentorshipProfileItem,
  AlumniJobPostingItem,
  AlumniDonationCampaignItem,
  AlumniDonationItem,
  AlumniChapterItem,
  AlumniEventItem,
} from '../../operations/alumni/types';

describe('Alumni Store Data Access Layer & Multi-Tenant Isolation (Sprint-058 - ALUM-002)', () => {
  let store: AlumniDbStore;
  const inst1 = 'inst_campus_alpha';
  const inst2 = 'inst_campus_beta';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should support full alumni profile lifecycle with educations and experiences', async () => {
    const profile: AlumniProfileItem = {
      id: 'alum_001',
      institutionId: inst1,
      firstName: 'Amina',
      lastName: 'Hassan',
      email: 'amina.hassan@example.com',
      graduationBatchYear: 2022,
      primaryDegree: 'B.Tech Computer Science',
      primaryDepartment: 'Computer Science',
      isVerified: true,
      isMentor: true,
      isHiring: false,
      privacyConsentLevel: 'alumni_only',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createAlumniProfile(profile);

    await store.addEducation({
      id: 'edu_001',
      alumniProfileId: 'alum_001',
      institutionName: 'Thaiba College of Engineering',
      degree: 'B.Tech',
      fieldOfStudy: 'Computer Science',
      startYear: 2018,
      endYear: 2022,
      gradeCgpa: '3.9',
      isInstitutional: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await store.addExperience({
      id: 'exp_001',
      alumniProfileId: 'alum_001',
      company: 'NeuroTech Solutions',
      title: 'Senior Software Engineer',
      employmentType: 'full_time',
      industry: 'Technology',
      location: 'Dubai, UAE',
      startDate: '2022-07-01',
      isCurrent: true,
      skills: 'TypeScript,React,Python,PostgreSQL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const retrieved = await store.getAlumniProfileById('alum_001', inst1);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.firstName).toBe('Amina');
    expect(retrieved?.educations?.length).toBe(1);
    expect(retrieved?.experiences?.length).toBe(1);
    expect(retrieved?.experiences?.[0].company).toBe('NeuroTech Solutions');

    // Cross-tenant lookup should return null
    const crossTenant = await store.getAlumniProfileById('alum_001', inst2);
    expect(crossTenant).toBeNull();
  });

  it('should manage mentorship profiles and requests', async () => {
    const profile: AlumniProfileItem = {
      id: 'alum_mentor_1',
      institutionId: inst1,
      firstName: 'Tariq',
      lastName: 'Mansoor',
      email: 'tariq.mansoor@example.com',
      graduationBatchYear: 2020,
      primaryDegree: 'M.Sc Artificial Intelligence',
      primaryDepartment: 'Computer Science',
      isVerified: true,
      isMentor: true,
      isHiring: true,
      privacyConsentLevel: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createAlumniProfile(profile);

    const mentor: AlumniMentorshipProfileItem = {
      id: 'mentor_001',
      alumniProfileId: 'alum_mentor_1',
      institutionId: inst1,
      expertiseAreas: JSON.stringify(['AI & ML', 'Cloud Architecture', 'Career Strategy']),
      targetMenteeTypes: 'all',
      maxActiveMentees: 4,
      activeMenteeCount: 1,
      availabilityHoursPerMonth: 6,
      meetingType: 'virtual',
      averageRating: 4.9,
      totalReviewsCount: 15,
      totalHoursDelivered: 45,
      isAcceptingRequests: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createMentorshipProfile(mentor);

    const mentorsList = await store.listMentorshipProfiles(inst1);
    expect(mentorsList.length).toBe(1);
    expect(mentorsList[0].alumniProfile?.firstName).toBe('Tariq');

    const req = await store.createMentorshipRequest({
      id: 'req_001',
      institutionId: inst1,
      mentorshipProfileId: 'mentor_001',
      studentId: 'student_123',
      requestTopic: 'Machine Learning Portfolio Review',
      requestGoals: 'Prepare for junior ML engineer interview',
      compatibilityScore: 0.92,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(req.status).toBe('pending');

    const updatedReq = await store.updateMentorshipRequest('req_001', {
      status: 'accepted',
      responseNotes: 'Looking forward to our session!',
    });
    expect(updatedReq?.status).toBe('accepted');
  });

  it('should track job postings, applications, donations and campaigns with isolation', async () => {
    // 1. Job Posting
    const job: AlumniJobPostingItem = {
      id: 'job_001',
      institutionId: inst1,
      company: 'Apex Cloud Systems',
      title: 'Full Stack Engineer',
      roleType: 'full_time',
      workplaceType: 'remote',
      location: 'Bangalore / Remote',
      salaryCurrency: 'INR',
      minSalary: 1200000,
      maxSalary: 1800000,
      description: 'Building distributed systems',
      requirements: '3+ years Node.js and React experience',
      allowDirectApply: true,
      hasAlumniReferral: true,
      status: 'published',
      viewsCount: 0,
      applicationsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createJobPosting(job);

    await store.createJobApplication({
      id: 'app_001',
      jobPostingId: 'job_001',
      studentId: 'student_007',
      resumeUrl: 'https://cdn.thaiba.edu/resumes/std007.pdf',
      status: 'applied',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const retrievedJob = await store.getJobPostingById('job_001', inst1);
    expect(retrievedJob?.applicationsCount).toBe(1);

    // 2. Donation Campaign
    const campaign: AlumniDonationCampaignItem = {
      id: 'camp_001',
      institutionId: inst1,
      title: 'AI Lab Supercomputing Endowment',
      code: 'ENDOW-AI-2026',
      category: 'research_chair',
      description: 'Funding NVIDIA H100 compute cluster for student AI researchers',
      targetAmount: 5000000,
      raisedAmount: 0,
      donorCount: 0,
      startDate: '2026-01-01',
      status: 'active',
      isTaxExempt80G: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createDonationCampaign(campaign);

    const donation: AlumniDonationItem = {
      id: 'don_001',
      institutionId: inst1,
      campaignId: 'camp_001',
      donorName: 'Zayd Al-Mansoor',
      donorEmail: 'zayd@example.com',
      amount: 100000,
      currency: 'INR',
      paymentGateway: 'razorpay',
      status: 'confirmed',
      receipt80GNumber: '80G-2026-0001',
      receipt80GHash: 'hash_80g_abc123',
      recognitionTier: 'gold',
      isAnonymous: false,
      isCorporateMatching: false,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.createDonation(donation);

    const retrievedCamp = await store.getDonationCampaignById('camp_001', inst1);
    expect(retrievedCamp?.raisedAmount).toBe(100000);
    expect(retrievedCamp?.donorCount).toBe(1);
  });
});
