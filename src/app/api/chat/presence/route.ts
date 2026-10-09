import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { chatChannels, chatMembers } from "@thaiba/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { chatPresence } from "@/lib/chat/presence-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/presence
 * Retrieves the presence status for all staff members who share active mutual channels with caller.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  // Get caller's active joined channels in this tenant
  const myMemberships = await db
    .select({ channelId: chatMembers.channelId })
    .from(chatMembers)
    .innerJoin(
      chatChannels,
      and(
        eq(chatMembers.channelId, chatChannels.id),
        eq(chatChannels.institutionId, institutionId),
        eq(chatChannels.isActive, true)
      )
    )
    .where(eq(chatMembers.staffId, session.staffId))
    .all();

  if (myMemberships.length === 0) {
    return NextResponse.json({ presence: {} });
  }

  const channelIds = myMemberships.map((m) => m.channelId);

  // Get all distinct peers in those channels
  const peerMembers = await db
    .select({ staffId: chatMembers.staffId })
    .from(chatMembers)
    .where(inArray(chatMembers.channelId, channelIds))
    .all();

  const distinctPeerIds = Array.from(new Set(peerMembers.map((p) => p.staffId)));

  const presenceMap: Record<string, string> = {};
  for (const pid of distinctPeerIds) {
    presenceMap[pid] = chatPresence.getPresence(pid);
  }

  return NextResponse.json({ presence: presenceMap });
}, "chat:presence:read");
