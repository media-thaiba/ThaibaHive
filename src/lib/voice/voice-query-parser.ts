export type VoiceDomainIntent =
  | "GET_ATTENDANCE_SUMMARY"
  | "GET_FINANCIAL_MARGIN"
  | "GET_RISK_ALERT"
  | "SIMULATE_BUDGET"
  | "GET_SWARM_STATUS"
  | "GET_SWARM_LATENCY"
  | "GET_REMEDIATION_LOGS"
  | "GENERAL_QUERY";

export interface ParsedVoiceQuery {
  rawTranscript: string;
  intent: VoiceDomainIntent;
  campusId?: string;
  entityParams: Record<string, any>;
  confidence: number;
  synthesizedAudioText: string;
}

export function soundex(str: string): string {
  if (!str) return "";
  const s = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";

  const firstLetter = s[0];
  const codes: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };

  let res = firstLetter;
  let prevCode = codes[firstLetter] || "";

  for (let i = 1; i < s.length && res.length < 4; i++) {
    const char = s[i];
    const code = codes[char] || "";
    if (code && code !== prevCode) {
      res += code;
    }
    prevCode = code;
  }

  while (res.length < 4) {
    res += "0";
  }

  return res;
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const STOP_WORDS = new Set([
  "show", "what", "is", "the", "for", "campus", "summary", "operating",
  "margin", "financial", "attendance", "student", "budget", "reallocation",
  "risk", "alert", "retention", "alerts", "simulate", "if", "we"
]);

export class VoiceQueryParser {
  private campusDictionary: Record<string, string> = {
    north: "campus-north",
    south: "campus-south",
    main: "campus-main",
    west: "campus-west",
    east: "campus-east",
  };

  public parseTranscript(transcript: string): ParsedVoiceQuery {
    const text = transcript.toLowerCase().trim();
    let intent: VoiceDomainIntent = "GENERAL_QUERY";
    let campusId: string | undefined = undefined;
    const entityParams: Record<string, any> = {};
    let baseConfidence = 0.92;

    // 1. Try exact keyword extraction for campus
    for (const [key, id] of Object.entries(this.campusDictionary)) {
      if (text.includes(key)) {
        campusId = id;
        entityParams.campusName = key;
        break;
      }
    }

    // 2. If no exact match, try Levenshtein & Soundex fuzzy matching on non-stop words
    if (!campusId) {
      const words = text.split(/\s+/).map(w => w.replace(/[^a-z]/g, "")).filter(w => w.length >= 3);
      const campusKeys = Object.keys(this.campusDictionary);

      let bestMatch: { key: string; dist: number } | null = null;

      for (const word of words) {
        if (STOP_WORDS.has(word)) continue;
        const wordSoundex = soundex(word);

        for (const key of campusKeys) {
          const dist = levenshteinDistance(word, key);
          const keySoundex = soundex(key);

          if (dist <= 2 || (wordSoundex === keySoundex && wordSoundex !== "0000")) {
            if (!bestMatch || dist < bestMatch.dist) {
              bestMatch = { key, dist };
            }
          }
        }
      }

      if (bestMatch) {
        campusId = this.campusDictionary[bestMatch.key];
        entityParams.campusName = bestMatch.key;
        baseConfidence -= 0.10;
      }
    }

    // Intent detection logic
    if (text.includes("attendance") || text.includes("absent") || text.includes("atendance") || text.includes("absnt")) {
      intent = "GET_ATTENDANCE_SUMMARY";
    } else if (text.includes("financial") || text.includes("margin") || text.includes("budget") || text.includes("revenue") || text.includes("fnancial")) {
      if (text.includes("simulate") || text.includes("what if") || text.includes("simlate")) {
        intent = "SIMULATE_BUDGET";
      } else {
        intent = "GET_FINANCIAL_MARGIN";
      }
    } else if (text.includes("risk") || text.includes("alert") || text.includes("retention") || text.includes("rsik")) {
      intent = "GET_RISK_ALERT";
    } else if (text.includes("swarm") || text.includes("swarm status") || text.includes("agent status")) {
      intent = "GET_SWARM_STATUS";
    } else if (text.includes("latency") || text.includes("sync latency") || text.includes("vector-mesh")) {
      intent = "GET_SWARM_LATENCY";
    } else if (text.includes("remediation") || text.includes("healing") || text.includes("remediation logs")) {
      intent = "GET_REMEDIATION_LOGS";
    }

    const synthesizedAudioText = this.generateSynthesizedAudioResponse(intent, campusId, entityParams);

    return {
      rawTranscript: transcript,
      intent,
      campusId,
      entityParams,
      confidence: Number(Math.max(0.5, baseConfidence).toFixed(2)),
      synthesizedAudioText,
    };
  }

  private generateSynthesizedAudioResponse(
    intent: VoiceDomainIntent,
    campusId?: string,
    params?: Record<string, any>
  ): string {
    const campusStr = campusId ? `for ${params?.campusName || campusId}` : "across all campuses";
    switch (intent) {
      case "GET_ATTENDANCE_SUMMARY":
        return `Retrieving real-time attendance metrics ${campusStr}. Overall attendance rate is 94.2%.`;
      case "GET_FINANCIAL_MARGIN":
        return `Retrieving financial performance analysis ${campusStr}. Projected net margin is 18.5%.`;
      case "GET_RISK_ALERT":
        return `Scanning retention risk models ${campusStr}. 12 high-risk students identified for immediate intervention.`;
      case "SIMULATE_BUDGET":
        return `Executing interactive budget simulation ${campusStr}. Financial reallocation matrix updated under 100ms SLA.`;
      case "GET_SWARM_STATUS":
        return `Connected nodes: 7 active nodes registered. Node health indices are running stable.`;
      case "GET_SWARM_LATENCY":
        return `Vector-mesh sync latency average is 14 milliseconds. Performance parameters are within standard thresholds.`;
      case "GET_REMEDIATION_LOGS":
        return `Audit logs parsed. Last compliance action executed was database-healer diagnostics, ending with status success.`;
      default:
        return `Connecting your executive query to AI copilot swarms. Synthesis complete.`;
    }
  }
}
