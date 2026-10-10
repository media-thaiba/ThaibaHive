import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiCopilotSessions, staffInstitutions } from "@thaiba/db/schema";
import { voiceInteractSchema } from "@/lib/validation/schemas";
import { speechToTextAdapter } from "@/lib/voice/stt-adapter";
import { textToSpeechAdapter } from "@/lib/voice/tts-adapter";
import { intentClassifier } from "@/lib/voice/intent-classifier";
import { aiTokenTracker } from "@/lib/ai/metering/token-tracker";
import { eq, and, SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/copilot/voice/interact
 * Executes a full duplex voice interaction turn: STT -> Intent Classification -> TTS Synthesis + Token Metering.
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = voiceInteractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const {
    sessionId,
    audioBase64,
    clientTranscript,
    format,
    voiceProfile,
    language,
    returnAudio,
  } = parsed.data;

  // 1. Verify session exists and belongs to tenant
  const conditions: SQL[] = [
    eq(aiCopilotSessions.id, sessionId),
    eq(aiCopilotSessions.staffId, session.staffId),
  ];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(aiCopilotSessions.institutionId, institutionId));
  }

  const activeSession = await db
    .select()
    .from(aiCopilotSessions)
    .where(and(...conditions))
    .get();

  if (!activeSession) {
    return NextResponse.json({ error: "Active voice session not found" }, { status: 404 });
  }

  // 2. Speech to Text Transcription
  const sttResult = await speechToTextAdapter.transcribe({
    audioPayload: audioBase64,
    clientTranscript,
    format,
    language,
    institutionId,
  });

  const queryTranscript = sttResult.transcript || clientTranscript || "";

  // 3. Structured Intent Classification & Spoken Response Generation
  let sessionContext: Record<string, any> = {};
  try {
    if (activeSession.contextJson) {
      sessionContext = JSON.parse(activeSession.contextJson);
    }
  } catch {
    // Ignore context parse error
  }

  const classifiedIntent = await intentClassifier.classify({
    transcript: queryTranscript,
    context: sessionContext,
    institutionId,
  });

  // 4. Text to Speech Synthesis
  let ttsResult: any = null;
  if (returnAudio && classifiedIntent.spokenResponse) {
    ttsResult = await textToSpeechAdapter.synthesize({
      text: classifiedIntent.spokenResponse,
      voiceProfile,
      format: format === "pcm" ? "pcm" : "mp3",
      institutionId,
    });
  }

  // 5. Multi-Tenant Token Metering
  const estimatedInputTokens = Math.max(10, Math.ceil(queryTranscript.length / 4));
  const estimatedOutputTokens = Math.max(10, Math.ceil(classifiedIntent.spokenResponse.length / 4));

  await aiTokenTracker.recordUsage(
    institutionId,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  // 6. Update Session Record
  const now = new Date().toISOString();
  await db
    .update(aiCopilotSessions)
    .set({
      totalTurns: (activeSession.totalTurns || 0) + 1,
      totalInputTokens: (activeSession.totalInputTokens || 0) + estimatedInputTokens,
      totalOutputTokens: (activeSession.totalOutputTokens || 0) + estimatedOutputTokens,
      lastInteractionAt: now,
    })
    .where(and(...conditions));

  return NextResponse.json({
    success: true,
    sessionId,
    transcript: queryTranscript,
    sttConfidence: sttResult.confidence,
    intent: classifiedIntent,
    spokenResponse: classifiedIntent.spokenResponse,
    suggestedAction: classifiedIntent.suggestedAction,
    audio: ttsResult
      ? {
          audioBase64: ttsResult.audioBase64,
          format: ttsResult.format,
          durationMs: ttsResult.durationMs,
          voiceId: ttsResult.voiceId,
        }
      : null,
    usage: {
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
    },
  });
}, "ai:copilot:voice");
