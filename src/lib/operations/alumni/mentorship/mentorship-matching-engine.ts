import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import { AlumniMentorshipProfileItem, AlumniProfileItem } from '../types';
import { calculateSkillOverlap } from './skill-matcher';

export interface StudentMenteeProfile {
  studentId: string;
  institutionId: string;
  department: string;
  degreeProgram: string;
  targetRole: string;
  targetIndustry: string;
  desiredSkills: string[];
  preferredMeetingType?: 'virtual' | 'in_person' | 'hybrid';
  preferredLanguage?: string;
}

export interface MentorMatchResult {
  mentorProfileId: string;
  alumniProfileId: string;
  mentorName: string;
  mentorCompany?: string;
  mentorDesignation?: string;
  mentorIndustry?: string;
  averageRating: number;
  compatibilityScore: number; // 0.0 - 1.0 (or 0 - 100%)
  scoreBreakdown: {
    careerAlignment: number;
    industryDomain: number;
    skillOverlap: number;
    availabilityCapacity: number;
    academicBackground: number;
  };
  explanation: string;
}

export class MentorshipMatchingEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public calculateCompatibility(
    student: StudentMenteeProfile,
    mentor: AlumniMentorshipProfileItem,
    alumni: AlumniProfileItem
  ): MentorMatchResult {
    // 1. Career Alignment (35%)
    let careerScore = 0.3;
    const targetRole = student.targetRole.toLowerCase();
    const currentDesig = (alumni.currentDesignation || '').toLowerCase();
    const headline = (alumni.headline || '').toLowerCase();

    if (currentDesig.includes(targetRole) || targetRole.includes(currentDesig)) {
      careerScore = 1.0;
    } else if (headline.includes(targetRole)) {
      careerScore = 0.8;
    } else {
      careerScore = 0.5;
    }

    // 2. Industry Domain (25%)
    let industryScore = 0.3;
    const targetIndustry = student.targetIndustry.toLowerCase();
    const currentInd = (alumni.currentIndustry || '').toLowerCase();
    if (currentInd.includes(targetIndustry) || targetIndustry.includes(currentInd)) {
      industryScore = 1.0;
    } else {
      industryScore = 0.4;
    }

    // 3. Skill Overlap (20%)
    let mentorExpertise: string[] = [];
    try {
      mentorExpertise = JSON.parse(mentor.expertiseAreas);
    } catch {
      mentorExpertise = mentor.expertiseAreas.split(',').map((s) => s.trim());
    }
    const skillScore = calculateSkillOverlap(student.desiredSkills, mentorExpertise);

    // 4. Availability & Capacity (10%)
    const remainingSlots = Math.max(0, mentor.maxActiveMentees - mentor.activeMenteeCount);
    const capacityScore = mentor.maxActiveMentees > 0 ? remainingSlots / mentor.maxActiveMentees : 0;

    // 5. Academic Background (10%)
    let academicScore = 0.4;
    if (
      alumni.primaryDepartment.toLowerCase() === student.department.toLowerCase() ||
      alumni.primaryDegree.toLowerCase() === student.degreeProgram.toLowerCase()
    ) {
      academicScore = 1.0;
    }

    // Weighted composite score
    const totalScore =
      careerScore * 0.35 +
      industryScore * 0.25 +
      skillScore * 0.2 +
      capacityScore * 0.1 +
      academicScore * 0.1;

    const roundedScore = Math.round(totalScore * 100) / 100;

    return {
      mentorProfileId: mentor.id,
      alumniProfileId: alumni.id,
      mentorName: `${alumni.firstName} ${alumni.lastName}`,
      mentorCompany: alumni.currentCompany || undefined,
      mentorDesignation: alumni.currentDesignation || undefined,
      mentorIndustry: alumni.currentIndustry || undefined,
      averageRating: mentor.averageRating,
      compatibilityScore: roundedScore,
      scoreBreakdown: {
        careerAlignment: Math.round(careerScore * 100) / 100,
        industryDomain: Math.round(industryScore * 100) / 100,
        skillOverlap: Math.round(skillScore * 100) / 100,
        availabilityCapacity: Math.round(capacityScore * 100) / 100,
        academicBackground: Math.round(academicScore * 100) / 100,
      },
      explanation: `Strong ${Math.round(roundedScore * 100)}% match based on ${alumni.currentDesignation || 'industry expertise'} at ${alumni.currentCompany || 'leading firm'} and shared ${alumni.primaryDepartment} background.`,
    };
  }

  public async findTopMentorMatches(
    student: StudentMenteeProfile,
    limit: number = 5
  ): Promise<MentorMatchResult[]> {
    const availableMentors = await this.store.listMentorshipProfiles(student.institutionId);

    const matches: MentorMatchResult[] = [];
    for (const mentor of availableMentors) {
      if (mentor.alumniProfile) {
        // Exclude mentors with zero capacity
        if (mentor.activeMenteeCount >= mentor.maxActiveMentees) {
          continue;
        }
        const match = this.calculateCompatibility(student, mentor, mentor.alumniProfile);
        matches.push(match);
      }
    }

    // Sort descending by compatibility score then rating
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore || b.averageRating - a.averageRating);
    return matches.slice(0, limit);
  }
}

export const mentorshipMatchingEngine = new MentorshipMatchingEngine();
