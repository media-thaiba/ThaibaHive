import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, pollResponses } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { pollVoteSchema } from "@/lib/validation/schemas";
import {
  withPollVoteLock,
  parsePollOptions,
  canAccessPoll,
  resolvePollScope,
} from "@/lib/polls/ledger";
import { eq, and } from "drizzle-orm";

// "polls:read" is used intentionally for this self-service write action — staff can vote on polls they can read
export const POST = requireAuth(async (request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Poll ID is required" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`polls:vote:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Pre-normalize numeric inputs
  let rawOption = body.selectedOption;
  if (typeof rawOption === "string" && /^\d+$/.test(rawOption.trim())) {
    rawOption = Number(rawOption.trim());
  }

  const parsed = pollVoteSchema.safeParse({ selectedOption: rawOption });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const optionIndex = parsed.data.selectedOption;

  const poll = await db.select().from(polls).where(eq(polls.id, id)).get();
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const scopedInstId = await resolvePollScope(session);
  const hasAccess = await canAccessPoll(poll, session, scopedInstId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
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

  return withPollVoteLock(id, session.staffId, async () => {
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
      try {
        await db
          .insert(pollResponses)
          .values({
            id: crypto.randomUUID(),
            pollId: id,
            staffId: session.staffId,
            selectedOption: optionIndex,
            respondedAt: new Date().toISOString(),
          })
          .run();
      } catch (err: unknown) {
        // Fallback for constraint collision in parallel race conditions
        const isConstraint =
          err instanceof Error &&
          (err.message.includes("UNIQUE") || err.message.includes("constraint") || err.message.includes("duplicate"));
        if (isConstraint) {
          await db
            .update(pollResponses)
            .set({ selectedOption: optionIndex, respondedAt: new Date().toISOString() })
            .where(and(eq(pollResponses.pollId, id), eq(pollResponses.staffId, session.staffId)))
            .run();
        } else {
          throw err;
        }
      }
    }

    await logActivity({
      request,
      staffId: session.staffId,
      action: "POLL_VOTE",
      resourceType: "poll",
      resourceId: id,
      details: {
        selectedOption: optionIndex,
        isVoteUpdate: Boolean(existing),
      },
    });

    return NextResponse.json({ success: true, selectedOption: optionIndex });
  });
}, "polls:read");
