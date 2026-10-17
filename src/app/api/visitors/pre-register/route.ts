import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorRequests } from "@/db/schema";
import { requireAuth, resolveInstitutionContext } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";
import { visitorPreRegisterSchema } from "@/lib/validation/schemas";
import { validateHostStaff } from "@/lib/visitors/host-validation";
import { desc, eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, _session) => {
  const url = new URL(request.url);
  const instId = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));
  const requests = await db
    .select()
    .from(visitorRequests)
    .where(instId && instId !== "global" ? eq(visitorRequests.institutionId, instId) : undefined)
    .orderBy(desc(visitorRequests.createdAt))
    .all();

  return NextResponse.json({ requests });
}, "visitor:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = visitorPreRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid visitor pre-registration parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { visitorName, visitorPhone, visitorEmail, idType, idNumber, hostStaffId, purpose, expectedDate, expectedTimeWindow } = parsed.data;
  // Concrete (never "global") tenant — the NOT NULL FK on visitor_requests
  // rejects "global" inserts that admin sessions would otherwise produce.
  const institutionId = await resolveInstitutionContext(session, body.institutionId || null);
  if (!institutionId) {
    return NextResponse.json(
      { error: "Unable to resolve institution scope for pre-registration" },
      { status: 400 }
    );
  }

  const hostCheck = await validateHostStaff(hostStaffId, institutionId);
  if (!hostCheck.ok) {
    return NextResponse.json({ error: hostCheck.error }, { status: hostCheck.status });
  }

  const requestRecord = await db
    .insert(visitorRequests)
    .values({
      id: crypto.randomUUID(),
      institutionId,
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
