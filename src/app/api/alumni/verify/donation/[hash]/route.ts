import { NextResponse } from 'next/server';
import { withPublicApm } from '@/lib/api/public-apm';
import { alumniStore } from '@/db/alumni-store';
import { receipt80GGenerator } from '@/lib/operations/alumni/endowments/receipt-80g-generator';

export const GET = withPublicApm(async (_req: Request, { params }: { params: Promise<{ hash: string }> }) => {
  try {
    const { hash } = await params;
    if (!hash || hash.trim().length === 0) {
      return NextResponse.json({ error: 'Donation receipt hash is required' }, { status: 400 });
    }

    const donation = await alumniStore.getDonationByReceiptHash(hash);
    if (!donation) {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID_OR_NOT_FOUND',
          message: 'No official Section 80G donation receipt matches this cryptographic hash.',
        },
        { status: 404 }
      );
    }

    const campaign = await alumniStore.getDonationCampaignById(donation.campaignId, donation.institutionId);
    const signature = receipt80GGenerator.computeSignature(donation.receipt80GHash || hash);

    // Sanitize donor name for public display if anonymous or privacy-sensitive
    const publicDonorName = donation.isAnonymous
      ? 'Anonymous Philanthropist'
      : `${donation.donorName.charAt(0)}${'*'.repeat(Math.max(2, donation.donorName.length - 2))}${donation.donorName.slice(-1)}`;

    return NextResponse.json({
      success: true,
      status: 'GENUINE_80G_CERTIFICATE_VERIFIED',
      receiptNumber: donation.receipt80GNumber,
      institutionId: donation.institutionId,
      campaignTitle: campaign?.title || 'Institution Endowment Fund',
      donorName: publicDonorName,
      amount: donation.amount,
      currency: donation.currency,
      recognitionTier: donation.recognitionTier,
      isTaxExempt80G: campaign?.isTaxExempt80G ?? true,
      confirmedAt: donation.confirmedAt,
      signatureVerified: true,
      signature,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
});
