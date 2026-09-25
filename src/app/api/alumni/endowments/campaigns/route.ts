import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { endowmentCampaignEngine } from '@/lib/operations/alumni/endowments/endowment-campaign-engine';
import { alumniStore } from '@/db/alumni-store';
import { createCampaignSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const campaignId = url.searchParams.get('id');

  if (campaignId) {
    const progress = await endowmentCampaignEngine.getCampaignProgress(campaignId, institutionId);
    if (!progress) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...progress });
  }

  const list = await alumniStore.listDonationCampaigns(institutionId);
  return NextResponse.json({ success: true, campaigns: list });
}, 'alumni:donations:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const campaign = await endowmentCampaignEngine.createCampaign(parsed.data);
    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}, 'alumni:donations:manage');
