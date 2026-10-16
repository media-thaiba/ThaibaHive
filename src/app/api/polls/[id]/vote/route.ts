import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, pollResponses, staffDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

function parsePollOptions(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// "polls:read" is used intentionally for this self-service write action — staff can vote on polls they can read
export const POST = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const { selectedOption } = body as { selectedOption?: unknown };

  const isNumericInput =
    typeof selectedOption === "number" ||
    (typeof selectedOption === "string" && /^\d+$/.test(selectedOption.trim()));

  if (!isNumericInput) {
    return NextResponse.json({ error: "Valid option index is required" }, { status: 400 });
  }

  const optionIndex = Number(selectedOption);
  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return NextResponse.json({ error: "Valid option index is required" }, { status: 400 });
  }

  const poll = await db.select().from(polls).where(eq(polls.id, id)).get();
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);
  if (
    poll.targetInstitutionId &&
    scopedInstId &&
    scopedInstId !== "global" &&
    poll.targetInstitutionId !== scopedInstId
  ) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const isAdmin = ["super_admin", "admin", "principal"].includes(session.role);
  if (!isAdmin) {
    if (poll.targetRole && poll.targetRole !== session.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (poll.targetDepartmentId) {
      const deptMembership = await db
        .select()
        .from(staffDepartments)
        .where(
          and(
            eq(staffDepartments.staffId, session.staffId),
            eq(staffDepartments.departmentId, poll.targetDepartmentId)
          )
        )
        .get();
      if (!deptMembership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  if (!poll.isActive) {
    return NextResponse.json({ error: "Poll is closed" }, { status: 400 });
  }
  if (poll.expiresAt && new Date(poll.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Poll has expired" }, { status: 400 });
  }

  const options = parsePollOptions(poll.options);
  if (options.length > 0 && optionIndex >= options.length) {
    return NextResponse.json({ error: "Option index out of range" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(pollResponses)
    .where(and(eq(pollResponses.pollId, id), eq(pollResponses.staffId, session.staffId)))
    .get();

  if (existing) {
    await db
      .update(pollResponses)
      .set({ selectedOption: optionIndex, respondedAt: new Date().toISOString() })
      .where(eq(pollResponses.id, existing.id))
      .run();
  } else {
    await db
      .insert(pollResponses)
      .values({
        id: crypto.randomUUID(),
        pollId: id,
        staffId: session.staffId,
        selectedOption: optionIndex,
      })
      .run();
  }

  return NextResponse.json({ success: true });
}, "polls:read");
