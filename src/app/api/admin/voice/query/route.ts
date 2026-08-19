import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { voiceQuerySchema } from "@/lib/validation/schemas";
import { SpeechToTextAdapter } from "@/lib/voice/speech-to-text-adapter";
import { VoiceQueryParser } from "@/lib/voice/voice-query-parser";

const sttAdapter = new SpeechToTextAdapter();
const voiceParser = new VoiceQueryParser();

export const POST = requireAuth(async (request: Request) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const parse = voiceQuerySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { audioStreamBase64, transcriptText, audioFormat, language } = parse.data;

  try {
    const sttResult = await sttAdapter.processAudioInput(audioStreamBase64, transcriptText, audioFormat, language);

    if (sttResult.isNoiseFiltered || !sttResult.transcript) {
      return NextResponse.json(
        {
          error: "Low confidence speech input or noise detected",
          result: sttResult,
        },
        { status: 422 }
      );
    }

    const parsedQuery = voiceParser.parseTranscript(sttResult.transcript);

    return NextResponse.json(
      {
        message: "Voice query processed",
        sttResult,
        parsedQuery,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute voice query" },
      { status: 500 }
    );
  }
}, "voice:copilot");
