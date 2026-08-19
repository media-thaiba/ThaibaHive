export type VoiceIntentType =
  | "check_db_health"
  | "trigger_failover"
  | "scale_pool"
  | "restart_stream"
  | "unknown";

export interface VoiceIntent {
  intent: VoiceIntentType;
  params: Record<string, string>;
  rawTranscript: string;
}

export class VoiceIntentMapper {
  constructor() {}

  public mapTranscript(transcript: string): VoiceIntent {
    const clean = transcript.toLowerCase().trim();

    // 1. check database health
    if (
      clean.includes("database health") ||
      clean.includes("db health") ||
      clean.includes("check database") ||
      clean.includes("check db")
    ) {
      return {
        intent: "check_db_health",
        params: {},
        rawTranscript: transcript,
      };
    }

    // 2. trigger failover
    if (clean.includes("failover") || clean.includes("promote standby")) {
      const nodeMatch = clean.match(/(?:node|primary)\s+([a-zA-Z0-9_-]+)/);
      return {
        intent: "trigger_failover",
        params: {
          nodeId: nodeMatch ? nodeMatch[1] : "primary",
        },
        rawTranscript: transcript,
      };
    }

    // 3. scale pool
    if (clean.includes("scale pool") || clean.includes("resize pool") || clean.includes("scale connection")) {
      const poolMatch = clean.match(/(?:pool)\s+([a-zA-Z0-9_-]+)/);
      const actionMatch = clean.includes("down") || clean.includes("shrink") ? "down" : "up";
      return {
        intent: "scale_pool",
        params: {
          poolName: poolMatch ? poolMatch[1] : "primary-pool",
          action: actionMatch,
        },
        rawTranscript: transcript,
      };
    }

    // 4. restart stream
    if (
      (clean.includes("restart") && clean.includes("stream")) ||
      (clean.includes("reset") && clean.includes("stream")) ||
      (clean.includes("redirect") && clean.includes("stream"))
    ) {
      // Find a word starting with stream- or matching standard node ID
      const words = clean.split(/\s+/);
      let streamId = "";
      for (const word of words) {
        if (word.startsWith("stream-node-") || word.startsWith("stream-") || /^\d+$/.test(word)) {
          streamId = word;
          break;
        }
      }
      
      if (!streamId) {
        const streamMatch = clean.match(/(?:stream|node|room)\s+([a-zA-Z0-9_-]+)/);
        streamId = streamMatch ? streamMatch[1] : "stream-node-1";
      }

      return {
        intent: "restart_stream",
        params: {
          streamId,
        },
        rawTranscript: transcript,
      };
    }

    return {
      intent: "unknown",
      params: {},
      rawTranscript: transcript,
    };
  }
}
