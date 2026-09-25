import { GET as getProfiles, POST as createProfile } from '../../../app/api/alumni/profiles/route';
import { GET as getDirectory } from '../../../app/api/alumni/directory/route';
import { POST as matchMentor } from '../../../app/api/alumni/mentorship/match/route';
import { POST as createJob, GET as getJobs } from '../../../app/api/alumni/jobs/route';
import { POST as createCampaign, GET as getCampaigns } from '../../../app/api/alumni/endowments/campaigns/route';
import { POST as processDonation } from '../../../app/api/alumni/endowments/donate/route';
import { GET as verifyDonation } from '../../../app/api/alumni/verify/donation/[hash]/route';
import { AlumniDbStore } from '../../../db/alumni-store';

describe('Alumni Management REST API Routes (Sprint-058 - ALUM-013)', () => {
  beforeEach(() => {
    AlumniDbStore.getInstance().clearMemoryStore();
  });

  const mockAdminReq = (body?: any, searchParams?: Record<string, string>): Request => {
    const url = new URL('https://thaiba.edu/api/test');
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        url.searchParams.set(k, v);
      }
    }
    return new Request(url.toString(), {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token-admin',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('should create and list alumni profiles via REST API', async () => {
    const profilePayload = {
      institutionId: 'inst_api_01',
      firstName: 'Hamdan',
      lastName: 'Al-Nuaimi',
      email: 'hamdan@example.com',
      graduationBatchYear: 2023,
      primaryDegree: 'B.Tech AI',
      primaryDepartment: 'Computer Science',
      privacyConsentLevel: 'alumni_only',
      isMentor: true,
      isHiring: false,
    };

    const postReq = mockAdminReq(profilePayload);
    const postRes = await (createProfile as any)(postReq, { userId: 'u_adm', staffId: 'staff_adm', role: 'admin' });
    const postData = await postRes.json();

    expect(postRes.status).toBe(201);
    expect(postData.success).toBe(true);
    expect(postData.profile.firstName).toBe('Hamdan');

    // List Profiles
    const getReq = mockAdminReq(undefined, { institutionId: 'inst_api_01' });
    const getRes = await (getProfiles as any)(getReq, { userId: 'u_adm', staffId: 'staff_adm', role: 'admin' });
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.items.length).toBe(1);
  });

  it('should create donation campaign and process donation with double-entry GL and 80G receipt', async () => {
    // 1. Create Campaign
    const campPayload = {
      institutionId: 'inst_api_01',
      title: 'Robotics Center Endowment',
      code: 'ENDOW-ROBOT-26',
      category: 'research_chair',
      description: 'Funding advanced robotics lab equipment',
      targetAmount: 1000000,
      startDate: '2026-01-01',
      isTaxExempt80G: true,
    };
    const campReq = mockAdminReq(campPayload);
    const campRes = await (createCampaign as any)(campReq, { userId: 'u_adm', staffId: 'staff_adm', role: 'admin' });
    const campData = await campRes.json();
    expect(campRes.status).toBe(201);
    const campaignId = campData.campaign.id;

    // 2. Process Donation
    const donatePayload = {
      institutionId: 'inst_api_01',
      campaignId,
      donorName: 'Philanthropist Patron',
      donorEmail: 'patron@example.com',
      donorPanTaxId: 'PATRN1234K',
      amount: 100000,
      currency: 'INR',
      paymentGateway: 'razorpay',
    };
    const donReq = mockAdminReq(donatePayload);
    const donRes = await (processDonation as any)(donReq, { userId: 'u_donor', role: 'alumni' });
    const donData = await donRes.json();

    expect(donRes.status).toBe(201);
    expect(donData.success).toBe(true);
    expect(donData.donation.receipt80GNumber).toBeDefined();
    expect(donData.glJournal.isBalanced).toBe(true);

    // 3. Verify Receipt publicly
    const verifyReq = new Request('https://thaiba.edu/api/alumni/verify/donation/test');
    const verifyRes = await (verifyDonation as any)(verifyReq, {
      params: Promise.resolve({ hash: donData.donation.receipt80GHash }),
    });
    const verifyData = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verifyData.status).toBe('GENUINE_80G_CERTIFICATE_VERIFIED');
    expect(verifyData.amount).toBe(100000);
  });
});
