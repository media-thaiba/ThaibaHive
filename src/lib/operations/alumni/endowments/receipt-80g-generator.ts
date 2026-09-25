import crypto from 'crypto';
import { AlumniDonationItem, AlumniDonationCampaignItem } from '../types';

export interface Generated80GReceipt {
  receiptNumber: string;
  receiptHash: string;
  signature: string;
  qrPayload: string;
  receiptHtml: string;
  pdfUrl: string;
}

export class Receipt80GGenerator {
  private secretKey: string;

  constructor(secretKey: string = process.env.RECEIPT_SIGNING_KEY || 'thaiba_endowment_80g_secret_key_2026') {
    this.secretKey = secretKey;
  }

  public generateReceiptNumber(donationId: string, timestamp: Date = new Date()): string {
    const year = timestamp.getFullYear();
    const shortId = donationId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    return `80G-${year}-${shortId}`;
  }

  public computeReceiptHash(receiptNumber: string, amount: number, panTaxId: string, timestamp: string): string {
    const raw = `${receiptNumber}|${amount}|${panTaxId || 'ANONYMOUS'}|${timestamp}|${this.secretKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public computeSignature(receiptHash: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(receiptHash).digest('hex');
  }

  public compileReceiptDocument(
    donation: AlumniDonationItem,
    campaign: AlumniDonationCampaignItem,
    institutionName: string = 'Thaiba Garden Central Trust'
  ): Generated80GReceipt {
    const now = new Date();
    const isoTime = now.toISOString();
    const receiptNumber = donation.receipt80GNumber || this.generateReceiptNumber(donation.id, now);
    const receiptHash = this.computeReceiptHash(receiptNumber, donation.amount, donation.donorPanTaxId || '', isoTime);
    const signature = this.computeSignature(receiptHash);
    const verificationUrl = `https://thaibahive.edu/verify/donation/${receiptHash}`;
    const qrPayload = JSON.stringify({
      receiptNumber,
      amount: donation.amount,
      currency: donation.currency,
      donor: donation.isAnonymous ? 'Anonymous' : donation.donorName,
      institution: institutionName,
      verificationUrl,
      hash: receiptHash.substring(0, 16),
    });

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Section 80G Donation Receipt - ${receiptNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; }
    .crest { font-size: 24px; font-weight: bold; color: #0f766e; }
    .tax-badge { background: #f0fdf4; border: 1px solid #16a34a; color: #15803d; padding: 4px 12px; border-radius: 4px; font-weight: 600; display: inline-block; margin-top: 8px; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .label { font-weight: 600; color: #64748b; width: 35%; }
    .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; margin-top: 20px; text-align: center; }
    .amount-value { font-size: 28px; font-weight: bold; color: #0f766e; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .hash { font-family: monospace; word-break: break-all; }
  </style>
</head>
<body>
  <div class="header">
    <div class="crest">${institutionName}</div>
    <div>Official Endowment & Charitable Trust • Registration No: TRUST/80G/2024/9912</div>
    <div class="tax-badge">CERTIFICATE OF EXEMPTION UNDER SECTION 80G OF THE INCOME TAX ACT</div>
  </div>
  <table class="details-table">
    <tr><td class="label">Receipt Number</td><td><strong>${receiptNumber}</strong></td></tr>
    <tr><td class="label">Date of Issuance</td><td>${now.toLocaleDateString()}</td></tr>
    <tr><td class="label">Donor Name</td><td>${donation.isAnonymous ? 'Anonymous Philanthropist' : donation.donorName}</td></tr>
    <tr><td class="label">Donor Email</td><td>${donation.donorEmail}</td></tr>
    <tr><td class="label">Donor PAN / Tax ID</td><td>${donation.donorPanTaxId || 'NOT PROVIDED'}</td></tr>
    <tr><td class="label">Campaign Name</td><td>${campaign.title} (${campaign.code})</td></tr>
    <tr><td class="label">Payment Gateway & Ref</td><td>${donation.paymentGateway.toUpperCase()} - ${donation.gatewayTransactionId || donation.id}</td></tr>
  </table>
  <div class="amount-box">
    <div>Total Eligible 80G Tax-Deductible Donation</div>
    <div class="amount-value">${donation.currency} ${donation.amount.toLocaleString()}</div>
  </div>
  <div class="footer">
    <div>This is a cryptographically signed electronic certificate valid under the Information Technology Act.</div>
    <div>Verification Hash: <span class="hash">${receiptHash}</span></div>
    <div>HMAC-SHA256 Signature: <span class="hash">${signature}</span></div>
  </div>
</body>
</html>
    `.trim();

    return {
      receiptNumber,
      receiptHash,
      signature,
      qrPayload,
      receiptHtml,
      pdfUrl: `/api/alumni/receipts/${receiptNumber}.pdf`,
    };
  }
}

export const receipt80GGenerator = new Receipt80GGenerator();
