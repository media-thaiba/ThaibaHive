import { NextResponse } from "next/server";
import { withPublicApm } from "@/lib/api/public-apm";
import { FeeDbStore } from "@/db/fee-store";

export const GET = withPublicApm(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const { hash } = await context.params;
    if (!hash || hash.trim().length === 0) {
      return NextResponse.json({ error: "Fee receipt hash is required" }, { status: 400 });
    }

    const receipt = await FeeDbStore.getInstance().getReceiptByHash(hash);
    if (!receipt) {
      return NextResponse.json(
        {
          success: false,
          status: "INVALID_OR_NOT_FOUND",
          message: "No verified fee receipt matches this cryptographic hash.",
        },
        { status: 404 }
      );
    }

    const payment = await FeeDbStore.getInstance().getPaymentById(receipt.paymentId, receipt.institutionId);

    return NextResponse.json({
      success: true,
      status: "VERIFIED_FEE_RECEIPT",
      receiptNumber: receipt.receiptNumber,
      institutionId: receipt.institutionId,
      studentId: receipt.studentId,
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? "INR",
      paymentMethod: payment?.paymentMethod ?? "OTHER",
      paymentStatus: payment?.paymentStatus ?? "SUCCESS",
      paidAt: payment?.paidAt ?? receipt.issuedAt,
      confirmedAt: receipt.issuedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
});