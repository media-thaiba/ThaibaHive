import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiCopilotSessions, staffInstitutions } from "@thaiba/db/schema";
import { createVoiceSessionSchema } from "@/lib/validation/schemas";
import { eq, and, desc, SQL } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/copilot/voice/session
 * Retrieves the currently active voice session for the authenticated staff member.
 */
export const GET = requireAuth(async (request: Request, session) => {
  let institutionId = await resolveRequestInstitution(session);

  if (institutionId === "global") {
    const primary = await db
      .select({ instId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (primary?.instId) {
      institutionId = primary.instId;
    }
  }

  const conditions: SQL[] = [
    eq(aiCopilotSessions.staffId, session.staffId),
    eq(aiCopilotSessions.status, "active"),
  ];

  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiCopilotSessions.institutionId, institutionId));
  }

  const activeSession = await db
    .select()
    .from(aiCopilotSessions)
    .where(and(...conditions))
    .orderBy(desc(aiCopilotSessions.lastInteractionAt))
    .get();

  return NextResponse.json({
    success: true,
    session: activeSession || null,
  });
}, "ai:copilot:voice");

/**
 * POST /api/ai/copilot/voice/session
 * Creates a new active voice copilot session.
 */
export const POST = requireAuth(async (request: Request, session) => {
  let institutionId = await resolveRequestInstitution(session);

  if (institutionId === "global") {
    const primary = await db
      .select({ instId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (primary?.instId) {
      institutionId = primary.instId;
    }
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Default config
  }

  const parsed = createVoiceSessionSchema.safeParse(body);
  const channelType = parsed.success ? parsed.data.channelType : "voice";
  const context = parsed.success ? parsed.data.context : undefined;

  const sessionId = randomUUID();
  const now = new Date().toISOString();

  await db.insert(aiCopilotSessions).values({
    id: sessionId,
    institutionId,
    staffId: session.staffId,
    channelType,
    status: "active",
    contextJson: context ? JSON.stringify(context) : null,
    totalTurns: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    lastInteractionAt: now,
    createdAt: now,
  });

  const newSession = {
    id: sessionId,
    institutionId,
    staffId: session.staffId,
    channelType,
    status: "active",
    contextJson: context ? JSON.stringify(context) : null,
    totalTurns: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    lastInteractionAt: now,
    createdAt: now,
    endedAt: null,
  };

  return NextResponse.json(
    {
      success: true,
      session: newSession,
    },
    { status: 201 }
  );
}, "ai:copilot:voice");

/**
 * PATCH /api/ai/copilot/voice/session
 * Updates or terminates an active voice copilot session.
 */
export const PATCH = requireAuth(async (request: Request, session) => {
  let institutionId = await resolveRequestInstitution(session);

  if (institutionId === "global") {
    const primary = await db
      .select({ instId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (primary?.instId) {
      institutionId = primary.instId;
    }
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, status, context } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const conditions: SQL[] = [
    eq(aiCopilotSessions.id, sessionId),
    eq(aiCopilotSessions.staffId, session.staffId),
  ];

  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiCopilotSessions.institutionId, institutionId));
  }

  const existing = await db
    .select()
    .from(aiCopilotSessions)
    .where(and(...conditions))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    lastInteractionAt: now,
  };

  if (status) {
    updatePayload.status = status;
    if (status === "ended") {
      updatePayload.endedAt = now;
    }
  }

  if (context) {
    updatePayload.contextJson = JSON.stringify(context);
  }

  await db
    .update(aiCopilotSessions)
    .set(updatePayload)
    .where(and(...conditions));

  return NextResponse.json({
    success: true,
    session: {
      ...existing,
      ...updatePayload,
    },
  });
}, "ai:copilot:voice");
