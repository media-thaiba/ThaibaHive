
import { csvFormatter } from "../csv-formatter";
import { RegionalBenchmarkingService } from "@/lib/regional/regional-benchmarking-service";
import { ensureRegionalTablesExist } from "@/lib/regional/dw-etl-service";
import { db } from "@/db";
import { sql } from "drizzle-orm";

describe("REG-012: Multi-Campus Regional Export Engine", () => {
  it("formats regional benchmarks into structured CSV export content", async () => {
    await ensureRegionalTablesExist();

    const groupId = "rg_default";
    await db.run(sql`
      INSERT OR IGNORE INTO regional_groups (id, name, code)
      VALUES ('rg_default', 'Default Region', 'REG_DEF');
    `);

    const benchmarks = await RegionalBenchmarkingService.calculateBenchmarks({
      regionalGroupId: groupId,
      period: "30d",
      metricDomain: "all",
    });

    const exportData = benchmarks.map((b) => ({
      rankPosition: `#${b.rankPosition}`,
      institutionId: b.institutionId,
      rawScore: b.rawScore,
      normalizedScore: b.normalizedScore,
    }));

    const result = csvFormatter.generate({
      type: "regional_analytics",
      format: "csv",
      title: "Regional Analytics Export",
      columns: [
        { key: "rankPosition", header: "Rank" },
        { key: "institutionId", header: "Campus ID" },
        { key: "rawScore", header: "Raw Score" },
        { key: "normalizedScore", header: "Z-Score" },
      ],
      data: exportData,
    });

    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.contentType).toContain("text/csv");
  });
});
