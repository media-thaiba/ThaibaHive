import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, pollResponses, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { parsePollOptions } from "@/lib/polls/ledger";
import { eq, and, or, isNull, inArray, desc } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let targetedPolls: Array<typeof polls.$inferSelect> = [];

  if (session.role === "super_admin") {
    const targetFilter = requestedInst
      ? or(eq(polls.targetInstitutionId, requestedInst), isNull(polls.targetInstitutionId))
      : undefined;

    targetedPolls = await db
      .select()
      .from(polls)
      .where(targetFilter)
      .orderBy(desc(polls.createdAt))
      .all();
  } else if (session.role === "admin" || session.role === "principal") {
    // Institutional admins: restricted strictly to their active campus
    const instCondition = scopedInstId && scopedInstId !== "global"
      ? or(eq(polls.targetInstitutionId, scopedInstId), isNull(polls.targetInstitutionId))
      : undefined;

    targetedPolls = await db
      .select()
      .from(polls)
      .where(instCondition)
      .orderBy(desc(polls.createdAt))
      .all();
  } else {
    // Standard Staff target audience filtering
    const userDepts = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(eq(staffDepartments.staffId, session.staffId))
      .all();
    const deptIds = userDepts.map((d) => d.departmentId).filter(Boolean);

    const userInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const instIds = userInsts.map((i) => i.institutionId).filter(Boolean);
    if (scopedInstId && scopedInstId !== "global" && !instIds.includes(scopedInstId)) {
      instIds.push(scopedInstId);
    }

    const roleMatch = or(isNull(polls.targetRole), eq(polls.targetRole, session.role));

    const deptMatch = deptIds.length > 0
      ? or(isNull(polls.targetDepartmentId), inArray(polls.targetDepartmentId, deptIds))
      : isNull(polls.targetDepartmentId);

    const instMatch = instIds.length > 0
      ? or(isNull(polls.targetInstitutionId), inArray(polls.targetInstitutionId, instIds))
      : isNull(polls.targetInstitutionId);

    const targetingClause = and(roleMatch, deptMatch, instMatch);

    targetedPolls = await db
      .select()
      .from(polls)
      .where(and(eq(polls.isActive, true), targetingClause))
      .orderBy(desc(polls.createdAt))
      .all();
  }

  const myResponses = await db
    .select()
    .from(pollResponses)
    .where(eq(pollResponses.staffId, session.staffId))
    .all();

  const myVoteIndex = new Map(myResponses.map((r) => [r.pollId, r.selectedOption]));

  const pollVotes = await Promise.all(
    targetedPolls.map(async (poll) => {
      const responses = await db
        .select({ selectedOption: pollResponses.selectedOption })
        .from(pollResponses)
        .where(eq(pollResponses.pollId, poll.id))
        .all();

      const total = responses.length;
      const opts = parsePollOptions(poll.options);
      const votes = opts.map((opt, idx) => {
        const count = responses.filter((r) => r.selectedOption === idx).length;
        return {
          option: opt,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });

      const myIdx = myVoteIndex.get(poll.id);
      const myVote = myIdx !== undefined && myIdx >= 0 && myIdx < opts.length ? opts[myIdx] : null;

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        question: poll.question,
        options: votes,
        totalVotes: total,
        myVote,
        isActive: poll.isActive,
        expiresAt: poll.expiresAt,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
      };
    })
  );

  return NextResponse.json({ polls: pollVotes });
}, "polls:read");
