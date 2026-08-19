import { AudioStreamParser } from "../voice/audio-stream-parser";
import { SpeechToTextAdapter } from "../voice/speech-to-text-adapter";

describe("FED-015: Speech-to-Text Adapter Service Test Suite", () => {
  it("parses audio stream byte lengths and durations", () => {
    const parser = new AudioStreamParser();
    const mockBase64 = Buffer.from("mock pcm audio bytes 12345678901234567890").toString("base64");

    const parsed = parser.parseAudioPayload(mockBase64, "pcm");
    expect(parsed.isValidAudio).toBe(true);
    expect(parsed.byteLength).toBeGreaterThan(0);
    expect(parsed.durationMs).toBeGreaterThan(0);
  });

  it("normalizes provided text transcripts with high confidence", async () => {
    const adapter = new SpeechToTextAdapter();

    const result = await adapter.processAudioInput(
      undefined,
      "  What is the attendance summary for HODs?  ",
      "pcm",
      "en-US"
    );

    expect(result.transcript).toBe("What is the attendance summary for HODs?");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.isNoiseFiltered).toBe(false);
  });

  it("filters low-confidence or empty audio streams", async () => {
    const adapter = new SpeechToTextAdapter();

    const result = await adapter.processAudioInput(undefined, undefined);
    expect(result.transcript).toBe("");
    expect(result.isNoiseFiltered).toBe(true);
  });
});
