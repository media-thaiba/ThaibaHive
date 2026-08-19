
import { RegionalHodRankingService } from "../regional-hod-ranking-service";
import { ensureRegionalTablesExist } from "../dw-etl-service";
import { db } from "@/db";
import { regionalHodRankings, regionalGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("REG-006: Regional HOD Performance Ranking & Discipline Analytics Engine", () => {
  it("calculates HOD composite ratings and ranks discipline leaders accurately", async () => {
    await ensureRegionalTablesExist();

    const groupId = `rg_hod_${Date.now()}`;

    await db.insert(regionalGroups).values({
      id: groupId,
      name: "HOD Analytics Region",
      code: `RGH_${Date.now()}`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    const rankings = await RegionalHodRankingService.calculateRankings({
      regionalGroupId: groupId,
      limit: 10,
    });

    expect(rankings.length).toBeGreaterThanOrEqual(1);
    expect(rankings[0].rankPosition).toBe(1);
    expect(rankings[0].compositeScore).toBeGreaterThan(0);
    expect(rankings[0].performanceFactors.taskCompletionRate).toBeDefined();

    // Verify stored ranking records in DB
    const dbRecords = await db
      .select()
      .from(regionalHodRankings)
      .where(eq(regionalHodRankings.regionalGroupId, groupId))
      .all();

    expect(dbRecords.length).toBeGreaterThanOrEqual(1);
    expect(dbRecords[0].rankPosition).toBe(1);
  });
});
