import { NextResponse } from "next/server";
import { db } from "@/db";
import { pollResponses } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

// "polls:read" is used intentionally for this self-service write action — staff can vote on polls they can read
export const POST = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { selectedOption } = body;

  if (selectedOption === undefined || selectedOption === null) {
    return NextResponse.json({ error: "Option required" }, { status: 400 });
  }

  const optionIndex = Number(selectedOption);

  const existing = await db
    .select()
    .from(pollResponses)
    .where(and(eq(pollResponses.pollId, id), eq(pollResponses.staffId, session.staffId)))
    .get();

  if (existing) {
    await db.update(pollResponses).set({ selectedOption: optionIndex, respondedAt: new Date().toISOString() }).where(eq(pollResponses.id, existing.id)).run();
  } else {
    await db.insert(pollResponses).values({
      id: crypto.randomUUID(), pollId: id, staffId: session.staffId, selectedOption: optionIndex,
    }).run();
  }

  return NextResponse.json({ success: true });
}, "polls:read");
