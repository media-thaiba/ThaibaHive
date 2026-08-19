import { VoiceQueryParser, soundex, levenshteinDistance } from "../voice/voice-query-parser";

describe("FED-016 & MHD-003: Intent & NLP Voice Query Parser Test Suite", () => {
  it("parses financial query intents and extracts campus entity", () => {
    const parser = new VoiceQueryParser();

    const result = parser.parseTranscript("Show financial operating margin for Campus North");
    expect(result.intent).toBe("GET_FINANCIAL_MARGIN");
    expect(result.campusId).toBe("campus-north");
    expect(result.confidence).toBe(0.92);
    expect(result.synthesizedAudioText).toContain("18.5%");
  });

  it("parses attendance query intents", () => {
    const parser = new VoiceQueryParser();

    const result = parser.parseTranscript("What is the student attendance summary for South Campus?");
    expect(result.intent).toBe("GET_ATTENDANCE_SUMMARY");
    expect(result.campusId).toBe("campus-south");
    expect(result.confidence).toBe(0.92);
    expect(result.synthesizedAudioText).toContain("94.2%");
  });

  it("parses budget simulation queries", () => {
    const parser = new VoiceQueryParser();

    const result = parser.parseTranscript("What if we simulate budget reallocation for Main campus?");
    expect(result.intent).toBe("SIMULATE_BUDGET");
    expect(result.campusId).toBe("campus-main");
  });

  it("parses risk alert queries", () => {
    const parser = new VoiceQueryParser();

    const result = parser.parseTranscript("Show student retention risk alerts");
    expect(result.intent).toBe("GET_RISK_ALERT");
    expect(result.synthesizedAudioText).toContain("high-risk students");
  });

  // --- MHD-003 Fuzzy & Phonetic Matching Tests ---

  it("calculates Soundex codes correctly", () => {
    expect(soundex("North")).toBe("N630");
    expect(soundex("Nortt")).toBe("N630");
    expect(soundex("South")).toBe("S300");
  });

  it("calculates Levenshtein distance correctly", () => {
    expect(levenshteinDistance("north", "nortt")).toBe(1);
    expect(levenshteinDistance("south", "soutt")).toBe(1);
    expect(levenshteinDistance("main", "mane")).toBe(2);
  });

  it("fuzzy matches slightly misspelled campus name 'nortt' with downgraded confidence", () => {
    const parser = new VoiceQueryParser();
    const result = parser.parseTranscript("Show financial operating margin for Campus Nortt");
    expect(result.intent).toBe("GET_FINANCIAL_MARGIN");
    expect(result.campusId).toBe("campus-north");
    expect(result.confidence).toBe(0.82);
  });

  it("fuzzy matches phonetically similar campus name 'soutt'", () => {
    const parser = new VoiceQueryParser();
    const result = parser.parseTranscript("What is the student attendance summary for Soutt Campus?");
    expect(result.intent).toBe("GET_ATTENDANCE_SUMMARY");
    expect(result.campusId).toBe("campus-south");
    expect(result.confidence).toBe(0.82);
  });

  it("fuzzy matches misspelled intent 'fnancial' and campus 'mane'", () => {
    const parser = new VoiceQueryParser();
    const result = parser.parseTranscript("Show fnancial summary for Mane campus");
    expect(result.intent).toBe("GET_FINANCIAL_MARGIN");
    expect(result.campusId).toBe("campus-main");
    expect(result.confidence).toBe(0.82);
  });

  it("fuzzy matches misspelled risk intent 'rsik' for campus 'wist'", () => {
    const parser = new VoiceQueryParser();
    const result = parser.parseTranscript("Show rsik alerts for Wist campus");
    expect(result.intent).toBe("GET_RISK_ALERT");
    expect(result.campusId).toBe("campus-west");
    expect(result.confidence).toBe(0.82);
  });
});
