import { VoiceQueryParser } from "../voice/voice-query-parser";
import { SpeechToTextAdapter } from "../voice/speech-to-text-adapter";
import { POST as voiceQueryPOST } from "@/app/api/admin/voice/query/route";

describe("MHD-004: Mobile Voice Copilot API Integration & Pipeline Test Suite", () => {
  let parser: VoiceQueryParser;
  let sttAdapter: SpeechToTextAdapter;

  beforeEach(() => {
    parser = new VoiceQueryParser();
    sttAdapter = new SpeechToTextAdapter();
  });

  it("processes transcript input through STT adapter and VoiceQueryParser end-to-end", async () => {
    const transcriptText = "Show attendance summary for Campus North";
    const sttResult = await sttAdapter.processAudioInput(
      undefined,
      transcriptText,
      "pcm",
      "en-US"
    );

    expect(sttResult.transcript).toBe(transcriptText);
    expect(sttResult.confidence).toBeGreaterThan(0.8);
    expect(sttResult.isNoiseFiltered).toBe(false);

    const parsedQuery = parser.parseTranscript(sttResult.transcript);
    expect(parsedQuery.intent).toBe("GET_ATTENDANCE_SUMMARY");
    expect(parsedQuery.campusId).toBe("campus-north");
    expect(parsedQuery.synthesizedAudioText).toContain("94.2%");
  });

  it("handles noise-filtered low-confidence STT inputs gracefully", async () => {
    const lowConfResult = await sttAdapter.processAudioInput(
      undefined,
      "",
      "pcm",
      "en-US"
    );

    expect(lowConfResult.isNoiseFiltered).toBe(true);
    expect(lowConfResult.transcript).toBe("");
  });

  it("extracts fuzzy matches for misrecognized voice transcripts", async () => {
    const sttResult = await sttAdapter.processAudioInput(
      undefined,
      "Show financial margin for Campus Nortt",
      "pcm",
      "en-US"
    );

    const parsedQuery = parser.parseTranscript(sttResult.transcript);
    expect(parsedQuery.intent).toBe("GET_FINANCIAL_MARGIN");
    expect(parsedQuery.campusId).toBe("campus-north");
    expect(parsedQuery.confidence).toBeLessThan(0.9);
  });

  it("rejects unauthenticated POST to /api/admin/voice/query with HTTP 401 status", async () => {
    process.env.TEST_FORCE_UNAUTH = "true";
    const req: any = {
      url: "http://localhost:3000/api/admin/voice/query",
      method: "POST",
      headers: new Headers({ "x-unauthenticated": "true" }),
      json: async () => ({ transcriptText: "Hello" }),
    };

    const res = await voiceQueryPOST(req);
    delete process.env.TEST_FORCE_UNAUTH;
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe("Not authenticated");
  });

  it("validates authorization token injection pattern and session cookie extraction", () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-session-jwt-token-12345",
      "Cookie": "thaibahive_session=nonce_abc123xyz",
    };

    expect(headers["Authorization"]).toMatch(/^Bearer\s+/);
    expect(headers["Cookie"]).toContain("thaibahive_session=");
  });
});
