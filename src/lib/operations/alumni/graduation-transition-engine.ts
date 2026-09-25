import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../db/alumni-store';
import { AlumniProfileItem, AlumniEducationItem } from './types';

export interface GraduatingStudentPayload {
  studentId: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  degreeProgram: string;
  graduationBatchYear: number;
  graduationDate: string;
  cgpa?: string;
  honors?: string;
}

export interface TransitionResult {
  success: boolean;
  alumniProfileId: string;
  credentialHash: string;
  isExisting: boolean;
  message: string;
}

export class GraduationTransitionEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public computeCredentialHash(student: GraduatingStudentPayload): string {
    const raw = `${student.institutionId}|${student.studentId}|${student.degreeProgram}|${student.graduationDate}|${student.cgpa || 'NA'}|${student.honors || 'NA'}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public async transitionGraduatingStudent(payload: GraduatingStudentPayload): Promise<TransitionResult> {
    // Check if alumni profile already exists for this studentId or email
    const existing = await this.store.getAlumniProfileByEmail(payload.email, payload.institutionId);
    if (existing) {
      return {
        success: true,
        alumniProfileId: existing.id,
        credentialHash: existing.credentialHash || this.computeCredentialHash(payload),
        isExisting: true,
        message: 'Alumni profile already transitioned for this graduate.',
      };
    }

    const profileId = `alum_${crypto.randomUUID()}`;
    const credentialHash = this.computeCredentialHash(payload);
    const now = new Date().toISOString();

    const newProfile: AlumniProfileItem = {
      id: profileId,
      institutionId: payload.institutionId,
      studentId: payload.studentId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      graduationBatchYear: payload.graduationBatchYear,
      primaryDegree: payload.degreeProgram,
      primaryDepartment: payload.department,
      credentialHash,
      isVerified: true,
      verifiedAt: now,
      isMentor: false,
      isHiring: false,
      privacyConsentLevel: 'alumni_only',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createAlumniProfile(newProfile);

    // Add initial degree education record
    const eduId = `edu_${crypto.randomUUID()}`;
    const education: AlumniEducationItem = {
      id: eduId,
      alumniProfileId: profileId,
      institutionName: 'Thaiba Academic Institution',
      degree: payload.degreeProgram,
      fieldOfStudy: payload.department,
      startYear: payload.graduationBatchYear - 4,
      endYear: payload.graduationBatchYear,
      gradeCgpa: payload.cgpa,
      honors: payload.honors,
      isInstitutional: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.addEducation(education);

    // Audit log
    await this.store.logAudit({
      id: `audit_${crypto.randomUUID()}`,
      auditId: `AUDIT-GRAD-${profileId.substring(5, 13)}`,
      institutionId: payload.institutionId,
      actorId: 'system_graduation_engine',
      actorRole: 'system',
      action: 'graduation_transitioned',
      entityType: 'alumni_profile',
      entityId: profileId,
      payloadHash: credentialHash,
      timestamp: now,
      createdAt: now,
    });

    return {
      success: true,
      alumniProfileId: profileId,
      credentialHash,
      isExisting: false,
      message: 'Graduating student successfully transitioned to verified alumni.',
    };
  }

  public async batchTransitionCohort(cohort: GraduatingStudentPayload[]): Promise<{
    processed: number;
    created: number;
    skipped: number;
    results: TransitionResult[];
  }> {
    const results: TransitionResult[] = [];
    let created = 0;
    let skipped = 0;

    for (const student of cohort) {
      const res = await this.transitionGraduatingStudent(student);
      results.push(res);
      if (res.isExisting) {
        skipped++;
      } else {
        created++;
      }
    }

    return {
      processed: cohort.length,
      created,
      skipped,
      results,
    };
  }
}

export const graduationTransitionEngine = new GraduationTransitionEngine();
