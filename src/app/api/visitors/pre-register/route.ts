import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { visitorPreRegisterSchema } from "@/lib/validation/schemas";
import { desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const requests = await db
    .select()
    .from(visitorRequests)
    .orderBy(desc(visitorRequests.createdAt))
    .all();

  return NextResponse.json({ requests });
}, "visitor:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = visitorPreRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid visitor pre-registration parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { visitorName, visitorPhone, visitorEmail, idType, idNumber, hostStaffId, purpose, expectedDate, expectedTimeWindow } = parsed.data;

  const requestRecord = await db
    .insert(visitorRequests)
    .values({
      id: crypto.randomUUID(),
      institutionId: "inst_001",
      visitorName,
      visitorPhone,
      visitorEmail: visitorEmail || null,
      idType: idType || null,
      idNumber: idNumber || null,
      hostStaffId,
      purpose,
      expectedDate,
      expectedTimeWindow: expectedTimeWindow || null,
      status: "pending",
    })
    .returning()
    .get();

  return NextResponse.json({ request: requestRecord }, { status: 201 });
}, "visitor:issue");
