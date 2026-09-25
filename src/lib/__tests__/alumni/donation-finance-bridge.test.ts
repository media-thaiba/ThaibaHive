import { AlumniDbStore } from '../../../db/alumni-store';
import { DonationFinanceBridge } from '../../operations/alumni/endowments/donation-finance-bridge';
import { AlumniDonationCampaignItem } from '../../operations/alumni/types';

describe('Donation Finance Bridge & 80G Tax Receipting (Sprint-058 - ALUM-010)', () => {
  let store: AlumniDbStore;
  let bridge: DonationFinanceBridge;
  const instId = 'inst_campus_fin';

  beforeEach(async () => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    bridge = new DonationFinanceBridge(store);

    const campaign: AlumniDonationCampaignItem = {
      id: 'camp_scholarship_26',
      institutionId: instId,
      title: 'Undergraduate Merit Scholarship Fund',
      code: 'SCHOLAR-FUND-2026',
      category: 'scholarship_fund',
      description: 'Need and merit scholarships for incoming freshmen',
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
  });

  it('should process donation, enforce balanced GL debits == credits, and generate signed 80G receipt', async () => {
    const result = await bridge.processConfirmedDonation({
      institutionId: instId,
      campaignId: 'camp_scholarship_26',
      donorName: 'Zubair Al-Khalidi',
      donorEmail: 'zubair@khalidi.com',
      donorPanTaxId: 'ABCDE1234F',
      amount: 250000,
      currency: 'INR',
      paymentGateway: 'razorpay',
      gatewayTransactionId: 'pay_rzp_987654',
      isAnonymous: false,
    });

    // 1. Verify donation record
    expect(result.donation.status).toBe('confirmed');
    expect(result.donation.recognitionTier).toBe('silver');
    expect(result.donation.receipt80GNumber).toBeDefined();

    // 2. Verify balanced Double-Entry GL Journal
    expect(result.glJournal.isBalanced).toBe(true);
    expect(result.glJournal.totalDebit).toBe(250000);
    expect(result.glJournal.totalCredit).toBe(250000);
    expect(result.glJournal.lines[0].accountCode).toBe('GL:1110-GATEWAY_CLEARING_ACCOUNT');
    expect(result.glJournal.lines[1].accountCode).toBe('GL:3110-SCHOLARSHIP_ENDOWMENT_REVENUE');

    // 3. Verify 80G Tax Receipt Document
    expect(result.receipt.receiptNumber).toContain('80G-');
    expect(result.receipt.signature).toBeDefined();
    expect(result.receipt.receiptHtml).toContain('CERTIFICATE OF EXEMPTION UNDER SECTION 80G');
    expect(result.receipt.receiptHtml).toContain('ABCDE1234F');
  });
});
