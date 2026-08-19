import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { requestId, status, rejectionReason } = body;

  if (!requestId || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid approval parameters" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(visitorRequests)
    .where(eq(visitorRequests.id, requestId))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Visitor pre-registration request not found" }, { status: 404 });
  }

  const updated = await db
    .update(visitorRequests)
    .set({
      status,
      rejectionReason: rejectionReason || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(visitorRequests.id, requestId))
    .returning()
    .get();

  return NextResponse.json({ request: updated });
}, "visitor:issue");
