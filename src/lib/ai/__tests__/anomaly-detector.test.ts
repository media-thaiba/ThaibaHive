import { detectAnomalies } from "../anomaly-detector";
import { generateExecutiveBriefing } from "../executive-summarizer";

describe("Sprint-008 Operational Anomaly Detection & AI Executive Summarizer", () => {
  it("detects operational anomalies or returns nominal baseline", async () => {
    const anomalies = await detectAnomalies("inst_01");
    expect(Array.isArray(anomalies)).toBe(true);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].institutionId).toBe("inst_01");
  });

  it("generates natural language executive briefing with metrics and recommendations", async () => {
    const briefing = await generateExecutiveBriefing("inst_01");
    expect(briefing.institutionId).toBe("inst_01");
    expect(typeof briefing.executiveSummary).toBe("string");
    expect(briefing.executiveSummary.length).toBeGreaterThan(20);
    expect(Array.isArray(briefing.recommendedActions)).toBe(true);
    expect(briefing.recommendedActions.length).toBeGreaterThan(0);
  });
});
