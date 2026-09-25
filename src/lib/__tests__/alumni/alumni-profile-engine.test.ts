import { AlumniDbStore } from '../../../db/alumni-store';
import { AlumniProfileEngine } from '../../operations/alumni/alumni-profile-engine';
import { PrivacyConsentManager } from '../../operations/alumni/privacy-consent-manager';
import { AlumniProfileItem } from '../../operations/alumni/types';

describe('Alumni Profile & Privacy Consent Engine (Sprint-058 - ALUM-004)', () => {
  let store: AlumniDbStore;
  let engine: AlumniProfileEngine;
  const instId = 'inst_campus_test';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new AlumniProfileEngine(store, new PrivacyConsentManager());
  });

  it('should sanitize private contact information for public anonymous viewers', async () => {
    const profile: AlumniProfileItem = {
      id: 'alum_sec_01',
      institutionId: instId,
      firstName: 'Rashid',
      lastName: 'Al-Harthy',
      email: 'rashid.alharthy@enterprise.com',
      phone: '+971 50 1234567',
      currentCompany: 'FinTech Emirates',
      currentDesignation: 'Lead Architect',
      currentIndustry: 'Financial Technology',
      currentCity: 'Dubai',
      currentCountry: 'UAE',
      graduationBatchYear: 2019,
      primaryDegree: 'B.Tech IT',
      primaryDepartment: 'Information Technology',
      isVerified: true,
      isMentor: true,
      isHiring: false,
      privacyConsentLevel: 'alumni_only',
      showEmail: false, // Disallow raw email
      showPhone: false, // Disallow raw phone
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createAlumniProfile(profile);

    // 1. Anonymous viewer -> should receive masked summary
    const publicView = await engine.getProfile('alum_sec_01', instId, 'public_anonymous');
    expect(publicView).not.toBeNull();
    expect(publicView?.isRedacted).toBe(true);
    expect(publicView?.lastName).toBe('A.');

    // 2. Logged-in alumni viewer -> should see full name, company, but masked email/phone based on flags
    const alumniView = await engine.getProfile('alum_sec_01', instId, 'alumni', 'other_alum_id');
    expect(alumniView).not.toBeNull();
    expect(alumniView?.lastName).toBe('Al-Harthy');
    expect(alumniView?.email).toContain('***@enterprise.com');
    expect(alumniView?.phone).toBe('+971 50 123****');

    // 3. Admin viewer -> should receive unmasked data
    const adminView = await engine.getProfile('alum_sec_01', instId, 'admin');
    expect(adminView?.email).toBe('rashid.alharthy@enterprise.com');
    expect(adminView?.phone).toBe('+971 50 1234567');
  });

  it('should add career experience and automatically update primary profile current position', async () => {
    const profile: AlumniProfileItem = {
      id: 'alum_exp_01',
      institutionId: instId,
      firstName: 'Fatima',
      lastName: 'Saeed',
      email: 'fatima.saeed@example.com',
      graduationBatchYear: 2021,
      primaryDegree: 'B.Des',
      primaryDepartment: 'Design',
      isVerified: true,
      isMentor: false,
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

    const exp = await engine.addCareerExperience('alum_exp_01', instId, {
      company: 'Global Design Lab',
      title: 'Principal Product Designer',
      employmentType: 'full_time',
      industry: 'Design & UX',
      location: 'Singapore',
      startDate: '2023-01-01',
      isCurrent: true,
      skills: 'Figma, Design Systems, User Research',
    });
    expect(exp).not.toBeNull();

    const updated = await store.getAlumniProfileById('alum_exp_01', instId);
    expect(updated?.currentCompany).toBe('Global Design Lab');
    expect(updated?.currentDesignation).toBe('Principal Product Designer');
    expect(updated?.currentIndustry).toBe('Design & UX');
  });
});
