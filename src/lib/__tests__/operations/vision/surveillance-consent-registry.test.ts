import { SurveillanceConsentRegistry } from '../../../operations/vision/privacy/surveillance-consent-registry';
import { DifferentialPrivacyRedactor } from '../../../operations/vision/privacy/differential-privacy-redactor';
import { VisionDbStore } from '../../../db/vision-store';

describe('SurveillanceConsentRegistry & Differential Privacy Engine', () => {
  let registry: SurveillanceConsentRegistry;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    registry = new SurveillanceConsentRegistry(store);
  });

  it('should register and retrieve student surveillance consent preferences', async () => {
    await registry.registerConsent({
      userId: 'student_101',
      userType: 'student',
      hasConsentedSurveillance: true,
      hasConsentedFacialAuth: false,
      optedOutZoneIds: ['zone_gym'],
      updatedAt: new Date().toISOString(),
    }, 'tenant_alpha');

    const consent = await registry.getConsent('student_101', 'tenant_alpha');
    expect(consent.hasConsentedSurveillance).toBe(true);
    expect(consent.hasConsentedFacialAuth).toBe(false);
    expect(consent.optedOutZoneIds).toContain('zone_gym');
  });

  // DPDP Act 2023 §9: consent must never be assumed for a subject with no record.
  it('should default to NO surveillance consent for unknown students', async () => {
    const consent = await registry.getConsent('student_unknown', 'tenant_alpha');
    expect(consent.hasConsentedSurveillance).toBe(false);
    expect(consent.hasConsentedFacialAuth).toBe(false);
    expect(consent.parentalConsentVerified).toBe(false);
    expect(consent.userType).toBe('student');
  });

  it('should isolate consent records per tenant', async () => {
    await registry.registerConsent({
      userId: 'student_202',
      userType: 'student',
      hasConsentedSurveillance: true,
      hasConsentedFacialAuth: false,
      optedOutZoneIds: [],
      updatedAt: new Date().toISOString(),
    }, 'tenant_alpha');

    const inOtherTenant = await registry.getConsent('student_202', 'tenant_beta');
    expect(inOtherTenant.hasConsentedSurveillance).toBe(false);
  });

  // DPDP Act 2023 §9(3): student facial recognition requires verified parental consent.
  it('should block student facial enrolment until parental consent is verified', async () => {
    expect(await registry.isFacialEnrolmentPermitted('student_303', 'tenant_alpha')).toBe(false);

    await registry.registerConsent({
      userId: 'student_303',
      userType: 'student',
      hasConsentedSurveillance: true,
      hasConsentedFacialAuth: true,
      parentalConsentVerified: true,
      parentalGuardianId: 'guardian_9',
      parentalConsentAt: new Date().toISOString(),
      parentalConsentMethod: 'guardian_portal',
      optedOutZoneIds: [],
      updatedAt: new Date().toISOString(),
    }, 'tenant_alpha');

    expect(await registry.isFacialEnrolmentPermitted('student_303', 'tenant_alpha')).toBe(true);
  });

  it('should refuse parental consent when the guardian is not linked to the student', async () => {
    const result = await registry.verifyParentalConsent({
      studentId: 'student_404',
      guardianId: 'guardian_unlinked',
      tenantId: 'tenant_alpha',
    });

    expect(result.verified).toBe(false);
    expect(result.reason).toMatch(/not linked/i);

    // Nothing was recorded, so facial enrolment stays blocked.
    expect(await registry.isFacialEnrolmentPermitted('student_404', 'tenant_alpha')).toBe(false);
  });

  it('should inject Laplace differential privacy noise into count analytics', () => {
    const rawCount = 100;
    const privatized = DifferentialPrivacyRedactor.privatizeCount(rawCount, 1.0);

    expect(privatized).toBeGreaterThanOrEqual(0);
    // Over reasonable bounds (within +/- 20 with high probability)
    expect(privatized).toBeGreaterThan(60);
    expect(privatized).toBeLessThan(140);
  });

  it('should execute 7-day rolling purge and log privacy audit trail', async () => {
    const purge = await registry.executeRollingPurge(7, 'tenant_alpha');
    expect(purge.purgedMetadataCount).toBeGreaterThan(0);
    expect(purge.merkleProof.length).toBe(64);

    const logs = await store.listPrivacyAuditLogs('tenant_alpha', 'rolling_purge');
    expect(logs.length).toBe(1);
    expect(logs[0].eventType).toBe('rolling_purge');
  });

  it('should record dual-authorization de-anonymization requests with audit signatures', async () => {
    const deanon = await registry.requestDualAuthDeAnonymization({
      incidentId: 'inc_critical_01',
      share1Signer: 'user_super_admin',
      share2Signer: 'user_legal_counsel',
      reason: 'Official police inquiry regarding campus break-in',
      tenantId: 'tenant_alpha',
    });

    expect(deanon.approved).toBe(true);
    const logs = await store.listPrivacyAuditLogs('tenant_alpha', 'dual_auth_deanon');
    expect(logs.length).toBe(1);
    expect(logs[0].authorizedByShare1).toBe('user_super_admin');
    expect(logs[0].authorizedByShare2).toBe('user_legal_counsel');
  });
});
