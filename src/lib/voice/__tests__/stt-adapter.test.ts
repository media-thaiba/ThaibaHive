import { speechToTextAdapter } from "../stt-adapter";

describe("SpeechToTextAdapter", () => {
  it("passes through clientTranscript with high confidence", async () => {
    const result = await speechToTextAdapter.transcribe({
      clientTranscript: "Show my attendance for this semester",
    });

    expect(result.transcript).toBe("Show my attendance for this semester");
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.isNoiseFiltered).toBe(false);
  });

  it("filters silence on empty or zero audio", async () => {
    const result = await speechToTextAdapter.transcribe({
      audioPayload: Buffer.alloc(1000), // All zeros = silence
      format: "pcm",
    });

    expect(result.isNoiseFiltered).toBe(true);
    expect(result.transcript).toBe("");
  });

  it("transcribes synthetic PCM audio", async () => {
    const numSamples = 3200; // 200ms
    const buffer = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / 16000);
      buffer.writeInt16LE(Math.floor(sample * 16000), i * 2);
    }

    const result = await speechToTextAdapter.transcribe({
      audioPayload: buffer,
      format: "pcm",
    });

    expect(result.transcript).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
