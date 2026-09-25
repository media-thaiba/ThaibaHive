import { AlumniDbStore } from '../../../db/alumni-store';
import {
  MentorshipMatchingEngine,
  StudentMenteeProfile,
} from '../../operations/alumni/mentorship/mentorship-matching-engine';
import { AlumniProfileItem, AlumniMentorshipProfileItem } from '../../operations/alumni/types';

describe('AI Mentorship Matching Engine (Sprint-058 - ALUM-005)', () => {
  let store: AlumniDbStore;
  let engine: MentorshipMatchingEngine;
  const instId = 'inst_campus_ai';

  beforeEach(async () => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new MentorshipMatchingEngine(store);

    // Mentor 1: AI Specialist in Tech
    const alum1: AlumniProfileItem = {
      id: 'alum_ai_1',
      institutionId: instId,
      firstName: 'Dr. Sameer',
      lastName: 'Khan',
      email: 'sameer.khan@ai-corp.com',
      currentCompany: 'DeepMind Research',
      currentDesignation: 'Staff Machine Learning Engineer',
      currentIndustry: 'Artificial Intelligence',
      graduationBatchYear: 2018,
      primaryDegree: 'B.Tech Computer Science',
      primaryDepartment: 'Computer Science',
      isVerified: true,
      isMentor: true,
      isHiring: false,
      privacyConsentLevel: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createAlumniProfile(alum1);
    await store.createMentorshipProfile({
      id: 'mentor_prof_1',
      alumniProfileId: 'alum_ai_1',
      institutionId: instId,
      expertiseAreas: JSON.stringify(['Machine Learning', 'Deep Learning', 'PyTorch', 'System Design']),
      targetMenteeTypes: 'all',
      maxActiveMentees: 3,
      activeMenteeCount: 0,
      availabilityHoursPerMonth: 6,
      meetingType: 'virtual',
      averageRating: 5.0,
      totalReviewsCount: 20,
      totalHoursDelivered: 60,
      isAcceptingRequests: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mentor 2: Civil Engineering Project Director
    const alum2: AlumniProfileItem = {
      id: 'alum_civil_2',
      institutionId: instId,
      firstName: 'Vikram',
      lastName: 'Menon',
      email: 'vikram.menon@infra.com',
      currentCompany: 'Metro Infrastructure',
      currentDesignation: 'Project Director',
      currentIndustry: 'Infrastructure & Construction',
      graduationBatchYear: 2015,
      primaryDegree: 'B.Tech Civil Engineering',
      primaryDepartment: 'Civil Engineering',
      isVerified: true,
      isMentor: true,
      isHiring: false,
      privacyConsentLevel: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createAlumniProfile(alum2);
    await store.createMentorshipProfile({
      id: 'mentor_prof_2',
      alumniProfileId: 'alum_civil_2',
      institutionId: instId,
      expertiseAreas: JSON.stringify(['Structural Design', 'Project Management', 'BIM Modelling']),
      targetMenteeTypes: 'all',
      maxActiveMentees: 4,
      activeMenteeCount: 1,
      availabilityHoursPerMonth: 4,
      meetingType: 'virtual',
      averageRating: 4.8,
      totalReviewsCount: 10,
      totalHoursDelivered: 30,
      isAcceptingRequests: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should calculate higher compatibility score for well-aligned CS/AI student with AI mentor', async () => {
    const student: StudentMenteeProfile = {
      studentId: 'std_cs_101',
      institutionId: instId,
      department: 'Computer Science',
      degreeProgram: 'B.Tech Computer Science',
      targetRole: 'Machine Learning Engineer',
      targetIndustry: 'Artificial Intelligence',
      desiredSkills: ['Machine Learning', 'Python', 'PyTorch'],
    };

    const matches = await engine.findTopMentorMatches(student, 5);
    expect(matches.length).toBe(2);

    // Top match should be Dr. Sameer Khan with >85% compatibility
    const topMatch = matches[0];
    expect(topMatch.mentorName).toBe('Dr. Sameer Khan');
    expect(topMatch.compatibilityScore).toBeGreaterThan(0.85);
    expect(topMatch.scoreBreakdown.careerAlignment).toBe(1.0);
    expect(topMatch.scoreBreakdown.industryDomain).toBe(1.0);

    // Second match should have significantly lower score
    const secondMatch = matches[1];
    expect(secondMatch.mentorName).toBe('Vikram Menon');
    expect(secondMatch.compatibilityScore).toBeLessThan(0.65);
  });
});
