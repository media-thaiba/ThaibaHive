import { audioStreamParser, AudioStreamParser } from "../audio-stream-parser";

describe("AudioStreamParser", () => {
  it("parses empty or missing payload as invalid audio", () => {
    const emptyResult = audioStreamParser.parseAudioPayload();
    expect(emptyResult.isValidAudio).toBe(false);
    expect(emptyResult.byteLength).toBe(0);
    expect(emptyResult.isSilence).toBe(true);
  });

  it("calculates RMS energy and non-silence for synthetic tone", () => {
    // Generate synthetic 16-bit 16kHz sine wave PCM
    const sampleRate = 16000;
    const numSamples = 1600; // 100ms
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
      buffer.writeInt16LE(Math.floor(sample * 16000), i * 2);
    }

    const energy = audioStreamParser.computeRmsEnergy(buffer);
    expect(energy).toBeGreaterThan(0.1);

    const parsed = audioStreamParser.parseAudioPayload(buffer, "pcm");
    expect(parsed.isValidAudio).toBe(true);
    expect(parsed.isSilence).toBe(false);
    expect(parsed.durationMs).toBe(100);
  });

  it("detects silence for quiet/zero PCM buffer", () => {
    const silentBuffer = Buffer.alloc(3200); // 100ms of zeros
    const parsed = audioStreamParser.parseAudioPayload(silentBuffer, "pcm");
    expect(parsed.isValidAudio).toBe(true);
    expect(parsed.isSilence).toBe(true);
    expect(parsed.energyRms).toBe(0);
  });

  it("chunks PCM buffer correctly", () => {
    const totalBytes = 32000; // 1000ms at 16kHz 16-bit mono
    const buffer = Buffer.alloc(totalBytes);
    const chunks = audioStreamParser.chunkPcmBuffer(buffer, 250); // 250ms chunks -> 4 chunks
    expect(chunks.length).toBe(4);
    expect(chunks[0].length).toBe(8000);
  });
});
