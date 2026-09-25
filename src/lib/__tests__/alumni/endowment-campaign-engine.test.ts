import { AlumniDbStore } from '../../../db/alumni-store';
import { EndowmentCampaignEngine } from '../../operations/alumni/endowments/endowment-campaign-engine';

describe('Endowment & Donation Campaign Engine (Sprint-058 - ALUM-009)', () => {
  let store: AlumniDbStore;
  let engine: EndowmentCampaignEngine;
  const instId = 'inst_campus_fund';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new EndowmentCampaignEngine(store);
  });

  it('should correctly classify recognition tiers and track campaign goal progress', async () => {
    expect(engine.determineRecognitionTier(25000, 'INR')).toBe('supporter');
    expect(engine.determineRecognitionTier(75000, 'INR')).toBe('bronze');
    expect(engine.determineRecognitionTier(500000, 'INR')).toBe('silver');
    expect(engine.determineRecognitionTier(1500000, 'INR')).toBe('gold');
    expect(engine.determineRecognitionTier(6000000, 'INR')).toBe('platinum');
    expect(engine.determineRecognitionTier(12000000, 'INR')).toBe('trustee_circle');

    const campaign = await engine.createCampaign({
      institutionId: instId,
      title: 'Solar Clean Energy Campus Endowment',
      code: 'ENDOW-SOLAR-2026',
      category: 'infrastructure',
      description: 'Solar panel array for campus NetZero goal',
      targetAmount: 2000000,
      startDate: '2026-01-01',
    });

    expect(campaign.status).toBe('active');
    expect(campaign.raisedAmount).toBe(0);

    // Record a donation in store
    await store.createDonation({
      id: 'don_sol_1',
      institutionId: instId,
      campaignId: campaign.id,
      donorName: 'Dr. Tariq Al-Banna',
      donorEmail: 'tariq@cleanenergy.org',
      amount: 1000000,
      currency: 'INR',
      paymentGateway: 'razorpay',
      status: 'confirmed',
      recognitionTier: 'gold',
      isAnonymous: false,
      isCorporateMatching: false,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const progress = await engine.getCampaignProgress(campaign.id, instId);
    expect(progress).not.toBeNull();
    expect(progress?.progressPercent).toBe(50);
    expect(progress?.remainingAmount).toBe(1000000);
  });
});
