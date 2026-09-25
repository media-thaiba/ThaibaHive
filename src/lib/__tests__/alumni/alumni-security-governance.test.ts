import { AlumniDbStore } from '../../../db/alumni-store';
import { PrivacyConsentManager } from '../../operations/alumni/privacy-consent-manager';
import { DonationFinanceBridge } from '../../operations/alumni/endowments/donation-finance-bridge';
import { TicketPassGenerator } from '../../operations/alumni/events/ticket-pass-generator';
import { AlumniProfileItem, AlumniDonationCampaignItem } from '../../operations/alumni/types';

describe('ALUMNI-HUB Security, RBAC & Financial Governance Suite (Sprint-058 - ALUM-020)', () => {
  let store: AlumniDbStore;
  let privacyMgr: PrivacyConsentManager;
  let financeBridge: DonationFinanceBridge;
  let passGen: TicketPassGenerator;

  const instAlpha = 'inst_alpha';
  const instBeta = 'inst_beta';

  beforeEach(async () => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    privacyMgr = new PrivacyConsentManager();
    financeBridge = new DonationFinanceBridge(store);
    passGen = new TicketPassGenerator('secret_test_key_2026');

    // Seed campaign in Alpha
    const campaign: AlumniDonationCampaignItem = {
      id: 'camp_alpha_01',
      institutionId: instAlpha,
      title: 'Alpha Tech Endowment',
      code: 'ENDOW-ALPHA-01',
      category: 'general_endowment',
      description: 'Endowment for campus development',
      targetAmount: 1000000,
      raisedAmount: 0,
      donorCount: 0,
      startDate: '2026-01-01',
      status: 'active',
      isTaxExempt80G: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createDonationCampaign(campaign);
  });

  describe('1. PII Redaction & Data Masking Invariants', () => {
    it('must strictly redact contact details for unauthenticated / anonymous users', () => {
      const profile: AlumniProfileItem = {
        id: 'alum_pii_1',
        institutionId: instAlpha,
        firstName: 'Zayd',
        lastName: 'Mansour',
        email: 'zayd.mansour@topsecretcorp.com',
        phone: '+971 55 9876543',
        graduationBatchYear: 2021,
        primaryDegree: 'B.Tech IT',
        primaryDepartment: 'Information Technology',
        currentCompany: 'Secret Cyber Lab',
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

      const sanitizedAnon = privacyMgr.sanitizeProfile(profile, 'public_anonymous');
      expect(sanitizedAnon.isRedacted).toBe(true);
      expect(sanitizedAnon.lastName).toBe('M.');
      expect(sanitizedAnon.email).toBeUndefined();
      expect(sanitizedAnon.phone).toBeUndefined();

      const sanitizedPeer = privacyMgr.sanitizeProfile(profile, 'alumni', 'peer_user_123');
      expect(sanitizedPeer.isRedacted).toBe(false);
      expect(sanitizedPeer.email).toContain('***@topsecretcorp.com');
      expect(sanitizedPeer.phone).toBe('+971 55 987****');
    });
  });

  describe('2. Double-Entry GL Ledger Balancing Invariants', () => {
    it('must enforce debits == credits for every single donation regardless of amount or gateway', () => {
      const amounts = [1, 500, 10000, 250000, 5000000];
      for (const amt of amounts) {
        const journal = financeBridge.createGLJournal(instAlpha, `don_test_${amt}`, amt, 'scholarship_fund', 'razorpay');
        expect(journal.isBalanced).toBe(true);
        expect(journal.totalDebit).toEqual(journal.totalCredit);
        expect(journal.totalDebit).toBe(amt);
      }
    });
  });

  describe('3. Ticket Pass Cryptographic Signature & Anti-Forgery', () => {
    it('must generate valid HMAC hash and reject forged or tampered passes', () => {
      const pass = passGen.generateTicketPass('evt_001', 'guest@thaiba.edu');
      expect(pass.ticketPassHash).toBeDefined();

      const isValid = passGen.verifyTicketPass(pass.ticketNumber, 'evt_001', 'guest@thaiba.edu', pass.ticketPassHash);
      expect(isValid).toBe(true);

      // Attempt verification with forged ticket number
      const isForged = passGen.verifyTicketPass('TKT-FORGED-999', 'evt_001', 'guest@thaiba.edu', pass.ticketPassHash);
      expect(isForged).toBe(false);

      // Attempt verification with different event
      const isCrossEvent = passGen.verifyTicketPass(pass.ticketNumber, 'evt_other_campus', 'guest@thaiba.edu', pass.ticketPassHash);
      expect(isCrossEvent).toBe(false);
    });
  });

  describe('4. Multi-Tenant Multi-Campus Boundary Isolation', () => {
    it('must never leak institution records across tenant query scopes', async () => {
      const profileAlpha: AlumniProfileItem = {
        id: 'alum_alpha_secure',
        institutionId: instAlpha,
        firstName: 'Alpha',
        lastName: 'Alumnus',
        email: 'alpha@thaiba.edu',
        graduationBatchYear: 2024,
        primaryDegree: 'B.Tech',
        primaryDepartment: 'CS',
        isVerified: true,
        isMentor: false,
        isHiring: false,
        privacyConsentLevel: 'public',
        showEmail: true,
        showPhone: true,
        showLocation: true,
        showCompany: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await store.createAlumniProfile(profileAlpha);

      const foundAlpha = await store.getAlumniProfileById('alum_alpha_secure', instAlpha);
      expect(foundAlpha).not.toBeNull();

      // Tenant Beta should not find it
      const foundBeta = await store.getAlumniProfileById('alum_alpha_secure', instBeta);
      expect(foundBeta).toBeNull();
    });
  });
});
