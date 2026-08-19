export interface ParsedAudioStream {
  format: string;
  byteLength: number;
  durationMs: number;
  isValidAudio: boolean;
  sampleRate: number;
}

export class AudioStreamParser {
  public parseAudioPayload(base64Payload?: string, format: string = "pcm"): ParsedAudioStream {
    if (!base64Payload || base64Payload.trim() === "") {
      return {
        format,
        byteLength: 0,
        durationMs: 0,
        isValidAudio: false,
        sampleRate: 16000,
      };
    }

    try {
      const buffer = Buffer.from(base64Payload, "base64");
      const byteLength = buffer.length;
      // Estimate duration: 16kHz 16-bit mono = 32,000 bytes per second
      const estimatedMs = Math.round((byteLength / 32000) * 1000);

      return {
        format,
        byteLength,
        durationMs: Math.max(100, estimatedMs),
        isValidAudio: byteLength > 32,
        sampleRate: 16000,
      };
    } catch {
      return {
        format,
        byteLength: 0,
        durationMs: 0,
        isValidAudio: false,
        sampleRate: 16000,
      };
    }
  }
}
