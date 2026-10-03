import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, pollResponses, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

export const GET = requireAuth(async (_request, session) => {
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);

  let targetedPolls;

  if (isAdmin) {
    targetedPolls = await db.select().from(polls).all();
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
        .select()
        .from(pollResponses)
        .where(eq(pollResponses.pollId, poll.id))
        .all();

      const total = responses.length;
      const opts = poll.options;
      const votes = opts.map((opt, idx) => ({
        option: opt,
        count: responses.filter((r) => r.selectedOption === idx).length,
        percentage: total > 0 ? Math.round((responses.filter((r) => r.selectedOption === idx).length / total) * 100) : 0,
      }));

      const myIdx = myVoteIndex.get(poll.id);
      const myVote = myIdx !== undefined ? opts[myIdx] : null;

      return {
        id: poll.id,
        question: poll.question,
        options: votes,
        totalVotes: total,
        myVote,
        isActive: poll.isActive,
        expiresAt: poll.expiresAt,
        createdAt: poll.createdAt,
      };
    })
  );

  return NextResponse.json({ polls: pollVotes });
}, "polls:read");