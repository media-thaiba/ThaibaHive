import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../db/alumni-store';
import {
  AlumniProfileItem,
  AlumniEducationItem,
  AlumniExperienceItem,
  PrivacyConsentLevel,
} from './types';
import { PrivacyConsentManager, privacyConsentManager, ViewerRole, SanitizedAlumniProfile } from './privacy-consent-manager';

export class AlumniProfileEngine {
  private store: AlumniDbStore;
  private privacyManager: PrivacyConsentManager;

  constructor(
    store: AlumniDbStore = alumniStore,
    privacyManager: PrivacyConsentManager = privacyConsentManager
  ) {
    this.store = store;
    this.privacyManager = privacyManager;
  }

  public async getProfile(
    profileId: string,
    institutionId: string,
    viewerRole: ViewerRole = 'public_anonymous',
    viewerId?: string
  ): Promise<SanitizedAlumniProfile | null> {
    const profile = await this.store.getAlumniProfileById(profileId, institutionId);
    if (!profile) return null;
    return this.privacyManager.sanitizeProfile(profile, viewerRole, viewerId);
  }

  public async updateProfile(
    profileId: string,
    institutionId: string,
    updates: Partial<AlumniProfileItem>
  ): Promise<AlumniProfileItem | null> {
    const existing = await this.store.getAlumniProfileById(profileId, institutionId);
    if (!existing) return null;
    return this.store.updateAlumniProfile(profileId, updates);
  }

  public async addCareerExperience(
    profileId: string,
    institutionId: string,
    experienceData: Omit<AlumniExperienceItem, 'id' | 'alumniProfileId' | 'createdAt' | 'updatedAt'>
  ): Promise<AlumniExperienceItem | null> {
    const profile = await this.store.getAlumniProfileById(profileId, institutionId);
    if (!profile) return null;

    const expId = `exp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const experience: AlumniExperienceItem = {
      id: expId,
      alumniProfileId: profileId,
      ...experienceData,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.addExperience(experience);

    // If current, update primary profile current company/title/industry
    if (experienceData.isCurrent) {
      await this.store.updateAlumniProfile(profileId, {
        currentCompany: experienceData.company,
        currentDesignation: experienceData.title,
        currentIndustry: experienceData.industry,
        currentCity: experienceData.location || profile.currentCity,
      });
    }

    return experience;
  }

  public async updatePrivacySettings(
    profileId: string,
    institutionId: string,
    settings: {
      privacyConsentLevel?: PrivacyConsentLevel;
      showEmail?: boolean;
      showPhone?: boolean;
      showLocation?: boolean;
      showCompany?: boolean;
    }
  ): Promise<AlumniProfileItem | null> {
    return this.updateProfile(profileId, institutionId, settings);
  }

  public async claimProfile(
    profileId: string,
    institutionId: string,
    userId: string,
    email: string
  ): Promise<AlumniProfileItem | null> {
    const profile = await this.store.getAlumniProfileById(profileId, institutionId);
    if (!profile) return null;
    if (profile.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Claim verification email mismatch.');
    }

    const now = new Date().toISOString();
    return this.store.updateAlumniProfile(profileId, {
      userId,
      status: 'active',
      claimedAt: now,
    });
  }
}

export const alumniProfileEngine = new AlumniProfileEngine();
