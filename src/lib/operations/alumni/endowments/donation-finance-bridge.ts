import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniDonationItem,
  DonationPaymentGateway,
} from '../types';
import { EndowmentCampaignEngine, endowmentCampaignEngine } from './endowment-campaign-engine';
import { Receipt80GGenerator, receipt80GGenerator, Generated80GReceipt } from './receipt-80g-generator';

export interface GLJournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface GLJournalEntry {
  journalId: string;
  institutionId: string;
  transactionRef: string;
  timestamp: string;
  lines: GLJournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface ProcessDonationInput {
  institutionId: string;
  campaignId: string;
  alumniProfileId?: string | null;
  donorName: string;
  donorEmail: string;
  donorPhone?: string | null;
  donorPanTaxId?: string | null;
  isAnonymous?: boolean;
  amount: number;
  currency?: string;
  paymentGateway?: DonationPaymentGateway;
  gatewayTransactionId?: string | null;
  isCorporateMatching?: boolean;
  corporateEmployerName?: string | null;
}

export class DonationFinanceBridge {
  private store: AlumniDbStore;
  private campaignEngine: EndowmentCampaignEngine;
  private receiptGenerator: Receipt80GGenerator;

  constructor(
    store: AlumniDbStore = alumniStore,
    campaignEngine: EndowmentCampaignEngine = endowmentCampaignEngine,
    receiptGenerator: Receipt80GGenerator = receipt80GGenerator
  ) {
    this.store = store;
    this.campaignEngine = campaignEngine;
    this.receiptGenerator = receiptGenerator;
  }

  public createGLJournal(
    institutionId: string,
    donationId: string,
    amount: number,
    category: string,
    gateway: string
  ): GLJournalEntry {
    const journalId = `GL-DON-${donationId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()}`;

    // Select Revenue Account based on Campaign Category
    let creditAccount = 'GL:3100-ENDOWMENT_GENERAL_REVENUE';
    let creditName = 'General Endowment Fund';
    if (category === 'scholarship_fund') {
      creditAccount = 'GL:3110-SCHOLARSHIP_ENDOWMENT_REVENUE';
      creditName = 'Scholarship Endowment Fund';
    } else if (category === 'infrastructure') {
      creditAccount = 'GL:3120-INFRASTRUCTURE_ENDOWMENT_REVENUE';
      creditName = 'Infrastructure Endowment Fund';
    } else if (category === 'research_chair') {
      creditAccount = 'GL:3130-RESEARCH_CHAIR_ENDOWMENT_REVENUE';
      creditName = 'Research Chair Endowment Fund';
    }

    const debitAccount = gateway === 'razorpay' || gateway === 'stripe' || gateway === 'upi'
      ? 'GL:1110-GATEWAY_CLEARING_ACCOUNT'
      : 'GL:1100-BANK_CASH_MAIN';

    const lines: GLJournalLine[] = [
      {
        accountCode: debitAccount,
        accountName: 'Cash & Gateway Settlements',
        debit: amount,
        credit: 0,
      },
      {
        accountCode: creditAccount,
        accountName: creditName,
        debit: 0,
        credit: amount,
      },
    ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    return {
      journalId,
      institutionId,
      transactionRef: donationId,
      timestamp: new Date().toISOString(),
      lines,
      totalDebit,
      totalCredit,
      isBalanced,
    };
  }

  public async processConfirmedDonation(input: ProcessDonationInput): Promise<{
    donation: AlumniDonationItem;
    glJournal: GLJournalEntry;
    receipt: Generated80GReceipt;
  }> {
    const campaign = await this.store.getDonationCampaignById(input.campaignId, input.institutionId);
    if (!campaign) {
      throw new Error('Campaign not found for donation processing.');
    }

    const donationId = `don_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const currency = input.currency || 'INR';
    const recognitionTier = this.campaignEngine.determineRecognitionTier(input.amount, currency);

    // 1. Double-Entry GL Journal
    const glJournal = this.createGLJournal(
      input.institutionId,
      donationId,
      input.amount,
      campaign.category,
      input.paymentGateway || 'razorpay'
    );

    if (!glJournal.isBalanced) {
      throw new Error('GL Journal invariant violation: Total Debits must equal Total Credits.');
    }

    // 2. Initial Donation Record
    const donation: AlumniDonationItem = {
      id: donationId,
      institutionId: input.institutionId,
      campaignId: input.campaignId,
      alumniProfileId: input.alumniProfileId,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      donorPhone: input.donorPhone,
      donorPanTaxId: input.donorPanTaxId,
      isAnonymous: input.isAnonymous ?? false,
      amount: input.amount,
      currency,
      paymentGateway: input.paymentGateway || 'razorpay',
      gatewayTransactionId: input.gatewayTransactionId || `tx_${crypto.randomUUID()}`,
      status: 'confirmed',
      glJournalId: glJournal.journalId,
      recognitionTier,
      isCorporateMatching: input.isCorporateMatching ?? false,
      corporateEmployerName: input.corporateEmployerName,
      confirmedAt: now,
      createdAt: now,
    };

    // 3. Generate Cryptographic 80G Receipt
    const receipt = this.receiptGenerator.compileReceiptDocument(donation, campaign);
    donation.receipt80GNumber = receipt.receiptNumber;
    donation.receipt80GHash = receipt.receiptHash;
    donation.receipt80GPdfUrl = receipt.pdfUrl;

    await this.store.createDonation(donation);

    // Audit Log
    await this.store.logAudit({
      id: `audit_${crypto.randomUUID()}`,
      auditId: `AUDIT-DON-${donationId.substring(4, 12)}`,
      institutionId: input.institutionId,
      actorId: input.alumniProfileId || 'public_donor',
      actorRole: input.alumniProfileId ? 'alumni' : 'donor',
      action: 'donation_received',
      entityType: 'alumni_donation',
      entityId: donationId,
      payloadHash: receipt.receiptHash,
      timestamp: now,
      createdAt: now,
    });

    return {
      donation,
      glJournal,
      receipt,
    };
  }
}

export const donationFinanceBridge = new DonationFinanceBridge();
