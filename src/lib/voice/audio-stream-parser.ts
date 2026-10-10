export interface ParsedAudioStream {
  format: string;
  byteLength: number;
  durationMs: number;
  isValidAudio: boolean;
  sampleRate: number;
  channels: number;
  energyRms: number;
  isSilence: boolean;
}

export interface VadOptions {
  energyThreshold?: number; // 0.0 to 1.0 (default 0.015)
  sampleRate?: number; // default 16000
  bytesPerSample?: number; // 2 for 16-bit PCM
}

export class AudioStreamParser {
  private energyThreshold: number;
  private defaultSampleRate: number;

  constructor(options?: VadOptions) {
    this.energyThreshold = options?.energyThreshold ?? 0.015;
    this.defaultSampleRate = options?.sampleRate ?? 16000;
  }

  /**
   * Computes Root Mean Square (RMS) energy of 16-bit linear PCM audio samples.
   */
  public computeRmsEnergy(pcmBuffer: Buffer): number {
    if (pcmBuffer.length < 2) return 0;

    let sumSquares = 0;
    const sampleCount = Math.floor(pcmBuffer.length / 2);

    for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
      const sample = pcmBuffer.readInt16LE(i) / 32768.0;
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / sampleCount);
  }

  /**
   * Parses audio payload (Base64 or raw Buffer) and extracts duration, validity, and VAD state.
   */
  public parseAudioPayload(payload?: string | Buffer, format: string = "pcm"): ParsedAudioStream {
    if (!payload) {
      return {
        format,
        byteLength: 0,
        durationMs: 0,
        isValidAudio: false,
        sampleRate: this.defaultSampleRate,
        channels: 1,
        energyRms: 0,
        isSilence: true,
      };
    }

    try {
      const buffer = typeof payload === "string" ? Buffer.from(payload, "base64") : payload;
      const byteLength = buffer.length;

      if (byteLength < 32) {
        return {
          format,
          byteLength,
          durationMs: 0,
          isValidAudio: false,
          sampleRate: this.defaultSampleRate,
          channels: 1,
          energyRms: 0,
          isSilence: true,
        };
      }

      // Calculate RMS energy for PCM
      let energyRms = 0.05;
      if (format.toLowerCase().includes("pcm") || format.toLowerCase().includes("raw")) {
        energyRms = this.computeRmsEnergy(buffer);
      }

      // 16kHz 16-bit mono = 32,000 bytes/sec
      const bytesPerSec = this.defaultSampleRate * 2;
      const durationMs = Math.round((byteLength / bytesPerSec) * 1000);
      const isSilence = energyRms < this.energyThreshold;

      return {
        format,
        byteLength,
        durationMs: Math.max(50, durationMs),
        isValidAudio: true,
        sampleRate: this.defaultSampleRate,
        channels: 1,
        energyRms: Math.round(energyRms * 10000) / 10000,
        isSilence,
      };
    } catch {
      return {
        format,
        byteLength: 0,
        durationMs: 0,
        isValidAudio: false,
        sampleRate: this.defaultSampleRate,
        channels: 1,
        energyRms: 0,
        isSilence: true,
      };
    }
  }

  /**
   * Splits continuous PCM audio stream into fixed millisecond chunk buffers for streaming STT.
   */
  public chunkPcmBuffer(buffer: Buffer, chunkDurationMs: number = 250): Buffer[] {
    const bytesPerMs = (this.defaultSampleRate * 2) / 1000;
    const chunkSize = Math.floor(bytesPerMs * chunkDurationMs);
    const chunks: Buffer[] = [];

    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      chunks.push(buffer.subarray(offset, Math.min(buffer.length, offset + chunkSize)));
    }

    return chunks;
  }
}

export const audioStreamParser = new AudioStreamParser();
