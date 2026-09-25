import { NextResponse } from 'next/server';
import { withPublicApm } from '@/lib/api/public-apm';
import { FeeDbStore } from '@/db/fee-store';
import { ReceiptGenerator } from '@/lib/operations/finance/receipts/receipt-generator';

export const GET = withPublicApm(async (_req: Request, { params }: { params: Promise<{ hash: string }> }) => {
  try {
    const { hash } = await params;
    if (!hash || hash.trim().length === 0) {
      return NextResponse.json({ error: 'Receipt hash is required' }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const receipt = await store.getReceiptByHash(hash);

    if (!receipt) {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID_OR_NOT_FOUND',
          message: 'No official receipt matches this cryptographic hash.',
        },
        { status: 404 }
      );
    }

    const generator = new ReceiptGenerator(store);
    const isSignatureValid = generator.verifyReceipt(receipt);

    const payment = await store.getPaymentById(receipt.paymentId);

    return NextResponse.json({
      success: true,
      status: isSignatureValid ? 'GENUINE_AND_VERIFIED' : 'SIGNATURE_MISMATCH',
      receiptNumber: receipt.receiptNumber,
      institutionId: receipt.institutionId,
      issuedAt: receipt.issuedAt,
      amount: payment?.netAmount || 0,
      currency: payment?.currency || 'INR',
      paymentMethod: payment?.paymentMethod || 'online',
      receiptHash: receipt.receiptHash,
      signatureVerified: isSignatureValid,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
});
