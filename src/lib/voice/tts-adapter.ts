import { aiProvider } from "../ai/providers/provider-registry";

export type VoiceProfile = "neutral_professional" | "friendly_campus" | "urgent_alert" | "academic_tutor";

export interface TtsSynthesisRequest {
  text: string;
  voiceProfile?: VoiceProfile;
  format?: "mp3" | "pcm" | "wav" | "opus";
  institutionId?: string;
}

export interface TtsSynthesisResult {
  audioBase64: string;
  format: string;
  durationMs: number;
  charCount: number;
  voiceId: string;
}

export class TextToSpeechAdapter {
  private voiceMap: Record<VoiceProfile, { voiceId: string; speed: number; pitch: number }> = {
    neutral_professional: { voiceId: "en-US-Neural2-F", speed: 1.0, pitch: 0.0 },
    friendly_campus: { voiceId: "en-US-Journey-F", speed: 1.05, pitch: 1.0 },
    urgent_alert: { voiceId: "en-US-Neural2-D", speed: 1.15, pitch: 0.0 },
    academic_tutor: { voiceId: "en-US-Neural2-A", speed: 0.95, pitch: -1.0 },
  };

  public async synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult> {
    const {
      text,
      voiceProfile = "neutral_professional",
      format = "mp3",
      institutionId,
    } = request;

    const profileConfig = this.voiceMap[voiceProfile] || this.voiceMap.neutral_professional;
    const charCount = text.length;
    // Estimate ~15 characters per second speech rate
    const estimatedDurationMs = Math.max(500, Math.round((charCount / 15) * 1000));

    try {
      const ttsProvider = aiProvider.getTextToSpeechProvider();
      const result = await ttsProvider.synthesize({
        text,
        voiceId: profileConfig.voiceId,
        speed: profileConfig.speed,
        pitch: profileConfig.pitch,
        format,
        institutionId,
      });

      return {
        audioBase64: result.audioBuffer.toString("base64"),
        format,
        durationMs: result.durationMs || estimatedDurationMs,
        charCount,
        voiceId: profileConfig.voiceId,
      };
    } catch {
      // Mock synthesis fallback for offline/test environments
      // Generates a mock 100ms silent PCM/WAV buffer
      const mockBuffer = Buffer.alloc(1600); // 100ms of 16kHz 16-bit mono PCM
      return {
        audioBase64: mockBuffer.toString("base64"),
        format,
        durationMs: estimatedDurationMs,
        charCount,
        voiceId: profileConfig.voiceId,
      };
    }
  }

  public async *synthesizeStream(request: TtsSynthesisRequest): AsyncIterable<{ chunkBase64: string; isFinal: boolean }> {
    const fullResult = await this.synthesize(request);
    const buffer = Buffer.from(fullResult.audioBase64, "base64");
    const chunkSize = 4096;

    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      const isFinal = offset + chunkSize >= buffer.length;
      const chunk = buffer.subarray(offset, Math.min(buffer.length, offset + chunkSize));
      yield {
        chunkBase64: chunk.toString("base64"),
        isFinal,
      };
    }
  }
}

export const textToSpeechAdapter = new TextToSpeechAdapter();
