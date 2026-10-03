import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { donationFinanceBridge } from '@/lib/operations/alumni/endowments/donation-finance-bridge';
import { donateCheckoutSchema } from '@/lib/validation/alumni-schemas';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = donateCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const result = await donationFinanceBridge.processConfirmedDonation({
      ...parsed.data,
      alumniProfileId: parsed.data.alumniProfileId || session.staffId,
    });

    return NextResponse.json({
      success: true,
      donation: result.donation,
      glJournal: result.glJournal,
      receipt: result.receipt,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Donation processing failed' }, { status: 500 });
  }
}, 'alumni:donations:collect');
