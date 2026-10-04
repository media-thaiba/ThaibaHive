import { NextResponse } from "next/server";
import { withPublicApm } from "@/lib/api/public-apm";
import { FeeDbStore } from "@/db/fee-store";

export const GET = withPublicApm(async (_req: Request, context: { params: Promise<Record<string, string>> }) => {
  try {
    const { hash } = await context.params;
    if (!hash || hash.trim().length === 0) {
      return NextResponse.json({ error: "Fee receipt hash is required" }, { status: 400 });
    }

    const verification = await FeeDbStore.getInstance().getReceiptByHash(hash);
    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          status: "INVALID_OR_NOT_FOUND",
          message: "No verified fee receipt matches this cryptographic hash.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "VERIFIED_FEE_RECEIPT",
      receiptNumber: verification.receiptNumber,
      institutionId: verification.institutionId,
      studentId: verification.studentId,
      paymentId: verification.paymentId,
      receiptHash: verification.receiptHash,
      signature: verification.signature,
      qrPayload: verification.qrPayload,
      receiptHtml: verification.receiptHtml,
      receiptPdfUrl: verification.receiptPdfUrl,
      downloadCount: verification.downloadCount,
      issuedAt: verification.issuedAt,
      createdAt: verification.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
});