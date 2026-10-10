import { textToSpeechAdapter } from "../tts-adapter";

describe("TextToSpeechAdapter", () => {
  it("synthesizes spoken audio for text prompt", async () => {
    const result = await textToSpeechAdapter.synthesize({
      text: "Good morning, you have 3 pending approvals today.",
      voiceProfile: "friendly_campus",
      format: "mp3",
    });

    expect(result.audioBase64).toBeDefined();
    expect(result.format).toBe("mp3");
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.charCount).toBeGreaterThan(10);
    expect(result.voiceId).toBeDefined();
  });

  it("yields streaming chunks during synthesizeStream", async () => {
    const chunks: string[] = [];
    for await (const chunk of textToSpeechAdapter.synthesizeStream({
      text: "Streaming audio response chunk test.",
      voiceProfile: "neutral_professional",
    })) {
      chunks.push(chunk.chunkBase64);
    }

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
