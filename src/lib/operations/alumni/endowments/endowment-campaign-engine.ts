import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniDonationCampaignItem,
  CampaignCategory,
  CampaignStatus,
  RecognitionTier,
} from '../types';

export interface CreateCampaignInput {
  institutionId: string;
  title: string;
  code: string;
  category: CampaignCategory;
  description: string;
  targetAmount: number;
  bannerImageUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  isTaxExempt80G?: boolean;
  matchingDonorName?: string | null;
  matchingRatio?: number | null;
}

export class EndowmentCampaignEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public determineRecognitionTier(amount: number, currency: string = 'INR'): RecognitionTier {
    // In INR normalization (assuming approx 1 USD = 80-100 INR)
    const inrValue = currency.toUpperCase() === 'USD' ? amount * 85 : amount;

    if (inrValue >= 10000000) return 'trustee_circle';
    if (inrValue >= 5000000) return 'platinum';
    if (inrValue >= 1000000) return 'gold';
    if (inrValue >= 250000) return 'silver';
    if (inrValue >= 50000) return 'bronze';
    return 'supporter';
  }

  public async createCampaign(input: CreateCampaignInput): Promise<AlumniDonationCampaignItem> {
    const campaignId = `camp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const campaign: AlumniDonationCampaignItem = {
      id: campaignId,
      institutionId: input.institutionId,
      title: input.title,
      code: input.code,
      category: input.category,
      description: input.description,
      targetAmount: input.targetAmount,
      raisedAmount: 0,
      donorCount: 0,
      bannerImageUrl: input.bannerImageUrl,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'active',
      isTaxExempt80G: input.isTaxExempt80G ?? true,
      matchingDonorName: input.matchingDonorName,
      matchingRatio: input.matchingRatio || 1.0,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createDonationCampaign(campaign);
    return campaign;
  }

  public async updateCampaignStatus(
    campaignId: string,
    institutionId: string,
    status: CampaignStatus
  ): Promise<AlumniDonationCampaignItem | null> {
    const campaign = await this.store.getDonationCampaignById(campaignId, institutionId);
    if (!campaign) return null;

    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    return this.store.createDonationCampaign(campaign);
  }

  public async getCampaignProgress(campaignId: string, institutionId: string): Promise<{
    campaign: AlumniDonationCampaignItem;
    progressPercent: number;
    remainingAmount: number;
  } | null> {
    const campaign = await this.store.getDonationCampaignById(campaignId, institutionId);
    if (!campaign) return null;

    const progressPercent =
      campaign.targetAmount > 0
        ? Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 1000) / 10)
        : 100;
    const remainingAmount = Math.max(0, campaign.targetAmount - campaign.raisedAmount);

    return {
      campaign,
      progressPercent,
      remainingAmount,
    };
  }
}

export const endowmentCampaignEngine = new EndowmentCampaignEngine();
