import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorPasses } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { VisitorQrPassService } from "@/lib/visitors/qr-pass-service";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { requestId, visitorName, visitorPhone, hostStaffId, purpose, validFrom, validUntil } = body;

  if (!visitorName || !hostStaffId || !validFrom || !validUntil) {
    return NextResponse.json({ error: "Missing required visitor pass parameters" }, { status: 400 });
  }

  const passId = crypto.randomUUID();
  const instId = "inst_001";

  const { qrPayload, signature } = VisitorQrPassService.issuePassPayload({
    institutionId: instId,
    visitorId: passId,
    hostId: hostStaffId,
    validFrom,
    validUntil,
  });

  const pass = await db
    .insert(visitorPasses)
    .values({
      id: passId,
      institutionId: instId,
      requestId: requestId || null,
      visitorName,
      visitorPhone: visitorPhone || "",
      hostStaffId,
      purpose: purpose || "Campus Visit",
      qrSignature: signature,
      validFrom,
      validUntil,
      status: "approved",
      gatekeeperId: session.staffId,
    })
    .returning()
    .get();

  return NextResponse.json({ pass, qrPayload }, { status: 201 });
}, "visitor:issue");
