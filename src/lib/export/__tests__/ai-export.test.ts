import { csvFormatter } from "../csv-formatter";
import type { ExportColumn } from "../types";

describe("Sprint-008 AI Insights & Prediction Export Integration", () => {
  it("generates sanitized CSV export for AI predictive records", () => {
    const columns: ExportColumn[] = [
      { key: "domain", header: "Domain" },
      { key: "predictionType", header: "Prediction Type" },
      { key: "riskLevel", header: "Risk Level" },
      { key: "confidenceScore", header: "Confidence Score" },
    ];

    const data = [
      {
        domain: "=cmd|' /C calc'!A1", // DDE formula injection attempt
        predictionType: "chronic_absenteeism",
        riskLevel: "critical",
        confidenceScore: "92%",
      },
    ];

    const result = csvFormatter.generate({
      type: "ai_insights",
      format: "csv",
      title: "AI Predictive Ledger",
      columns,
      data,
    });

    expect(typeof result.content).toBe("string");
    // Verifies DDE formula injection sanitization (prefixed with single quote)
    expect(result.content as string).toContain("'=cmd|");
  });
});

