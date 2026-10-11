export interface VadOptions {
  energyThreshold?: number; // RMS threshold between 0 and 1
  silenceDurationMs?: number; // Duration of silence to trigger end-of-turn
}

export class VadTranscriber {
  private energyThreshold: number;
  private silenceDurationMs: number;
  private isSpeaking = false;
  private lastSpeechTime = 0;
  private accumulatedChunks: string[] = [];
  private totalAudioBytesProcessed = 0;

  constructor(options?: VadOptions) {
    this.energyThreshold = options?.energyThreshold ?? 0.02;
    this.silenceDurationMs = options?.silenceDurationMs ?? 800;
  }

  /**
   * Calculates Root Mean Square (RMS) energy of a 16-bit PCM mono buffer.
   */
  public static calculateRms(pcm16Buffer: Buffer): number {
    if (pcm16Buffer.length < 2) return 0;
    const numSamples = Math.floor(pcm16Buffer.length / 2);
    let sumSquares = 0;

    for (let i = 0; i < numSamples; i++) {
      const sample = pcm16Buffer.readInt16LE(i * 2) / 32768.0; // Normalize to -1.0 .. 1.0
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / numSamples);
  }

  /**
   * Process a 16-bit PCM mono base64 audio chunk.
   * Returns whether voice activity was detected.
   */
  public processChunk(base64Pcm16: string): { isVoiceActive: boolean; rms: number; shouldSegment: boolean } {
    const buffer = Buffer.from(base64Pcm16, "base64");
    this.totalAudioBytesProcessed += buffer.length;
    const rms = VadTranscriber.calculateRms(buffer);
    const now = Date.now();

    const isVoiceActive = rms >= this.energyThreshold;
    let shouldSegment = false;

    if (isVoiceActive) {
      this.isSpeaking = true;
      this.lastSpeechTime = now;
      this.accumulatedChunks.push(base64Pcm16);
    } else if (this.isSpeaking) {
      this.accumulatedChunks.push(base64Pcm16);
      if (now - this.lastSpeechTime >= this.silenceDurationMs) {
        // Speech ended
        this.isSpeaking = false;
        shouldSegment = true;
      }
    }

    return { isVoiceActive, rms, shouldSegment };
  }

  public flushAccumulated(): string[] {
    const chunks = [...this.accumulatedChunks];
    this.accumulatedChunks = [];
    return chunks;
  }

  public getTotalBytesProcessed(): number {
    return this.totalAudioBytesProcessed;
  }

  public reset(): void {
    this.isSpeaking = false;
    this.lastSpeechTime = 0;
    this.accumulatedChunks = [];
    this.totalAudioBytesProcessed = 0;
  }
}
