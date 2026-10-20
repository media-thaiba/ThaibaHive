import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, pollResponses, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { pollUpdateSchema } from "@/lib/validation/schemas";
import {
  withPollLock,
  parsePollOptions,
  canAccessPoll,
  canManagePoll,
  resolvePollScope,
} from "@/lib/polls/ledger";
import { eq, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Poll ID is required" }, { status: 400 });

  const scopedInstId = await resolvePollScope(session);

  const poll = await db
    .select({
      id: polls.id,
      title: polls.title,
      description: polls.description,
      question: polls.question,
      options: polls.options,
      isActive: polls.isActive,
      expiresAt: polls.expiresAt,
      createdAt: polls.createdAt,
      updatedAt: polls.updatedAt,
      targetRole: polls.targetRole,
      targetDepartmentId: polls.targetDepartmentId,
      targetInstitutionId: polls.targetInstitutionId,
      createdById: polls.createdById,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
    })
    .from(polls)
    .leftJoin(staff, eq(polls.createdById, staff.id))
    .where(eq(polls.id, id))
    .get();

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const hasAccess = await canAccessPoll(poll, session, scopedInstId);
  if (!hasAccess) {
    // Fail-closed 404 prevents enumerating existence of cross-tenant or out-of-scope polls
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  // Calculate vote metrics
  const responses = await db
    .select({
      selectedOption: pollResponses.selectedOption,
      staffId: pollResponses.staffId,
    })
    .from(pollResponses)
    .where(eq(pollResponses.pollId, id))
    .all();

  const total = responses.length;
  const opts = parsePollOptions(poll.options);
  const voteTallies = opts.map((opt, idx) => {
    const count = responses.filter((r) => r.selectedOption === idx).length;
    return {
      option: opt,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const myVoteRecord = responses.find((r) => r.staffId === session.staffId);
  const myVote =
    myVoteRecord && myVoteRecord.selectedOption >= 0 && myVoteRecord.selectedOption < opts.length
      ? opts[myVoteRecord.selectedOption]
      : null;

  return NextResponse.json({
    poll: {
      ...poll,
      options: opts,
      voteTallies,
      totalVotes: total,
      myVote,
    },
  });
}, "polls:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Poll ID is required" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`polls:update:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const scopedInstId = await resolvePollScope(session);

  const poll = await db.select().from(polls).where(eq(polls.id, id)).get();
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const canManage = canManagePoll(poll, session, scopedInstId);
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: Not authorized to manage this poll" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = pollUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  return withPollLock(id, async () => {
    // If updating options, verify no votes have been cast yet
    if (parsed.data.options) {
      const voteCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(pollResponses)
        .where(eq(pollResponses.pollId, id))
        .get();

      if (voteCount && voteCount.count > 0) {
        return NextResponse.json(
          { error: "Cannot modify options of a poll that already has votes" },
          { status: 400 }
        );
      }
    }

    const updated = await db
      .update(polls)
      .set({
        title: parsed.data.title ?? poll.title,
        description: parsed.data.description !== undefined ? parsed.data.description : poll.description,
        question: parsed.data.question ?? poll.question,
        options: parsed.data.options ?? poll.options,
        isActive: parsed.data.isActive !== undefined ? parsed.data.isActive : poll.isActive,
        expiresAt: parsed.data.expiresAt !== undefined ? parsed.data.expiresAt : poll.expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(polls.id, id))
      .returning()
      .get();

    await logActivity({
      request,
      staffId: session.staffId,
      action: "POLL_UPDATE",
      resourceType: "poll",
      resourceId: id,
      details: {
        title: updated.title,
        isActive: updated.isActive,
        expiresAt: updated.expiresAt,
      },
    });

    return NextResponse.json({
      poll: {
        ...updated,
        options: parsePollOptions(updated.options),
      },
    });
  });
}, "polls:read");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Poll ID is required" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`polls:delete:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const scopedInstId = await resolvePollScope(session);

  const poll = await db.select().from(polls).where(eq(polls.id, id)).get();
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const canManage = canManagePoll(poll, session, scopedInstId);
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: Not authorized to delete this poll" }, { status: 403 });
  }

  return withPollLock(id, async () => {
    // Delete all responses first (cascade)
    await db.delete(pollResponses).where(eq(pollResponses.pollId, id)).run();
    await db.delete(polls).where(eq(polls.id, id)).run();

    await logActivity({
      request,
      staffId: session.staffId,
      action: "POLL_DELETE",
      resourceType: "poll",
      resourceId: id,
      details: {
        title: poll.title,
        question: poll.question,
      },
    });

    return NextResponse.json({ success: true });
  });
}, "polls:read");
