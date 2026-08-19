import { db } from "@/db";
import {
  regionalHodRankings,
  staff,
  tasks,
  attendanceLogs,
  performanceReviews,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureRegionalTablesExist } from "./dw-etl-service";

export interface HodRankingQueryOptions {
  regionalGroupId: string;
  discipline?: string;
  limit?: number;
}

export interface HodRankingRecord {
  hodStaffId: string;
  hodName: string;
  discipline: string;
  institutionId: string;
  compositeScore: number;
  rankPosition: number;
  performanceFactors: {
    taskCompletionRate: number;
    attendanceRate: number;
    reviewRating: number;
  };
}

export class RegionalHodRankingService {
  /**
   * Calculate regional HOD rankings and discipline analytics.
   */
  static async calculateRankings(options: HodRankingQueryOptions): Promise<HodRankingRecord[]> {
    await ensureRegionalTablesExist();

    // Query HOD staff
    const hodList = await db
      .select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(staff)
      .where(eq(staff.role, "hod"))
      .all();

    // Fallback list if DB has no explicit HOD staff registered
    const targets = hodList.length > 0 ? hodList.map(h => ({
      id: h.id,
      name: `${h.firstName} ${h.lastName}`,
      departmentId: "dept_cs",
      institutionId: "inst_default",
    })) : [
      { id: "hod_01", name: "Dr. Ahmed Hassan", departmentId: "dept_cs", institutionId: "inst_alpha" },
      { id: "hod_02", name: "Prof. Sarah Khan", departmentId: "dept_math", institutionId: "inst_beta" },
      { id: "hod_03", name: "Dr. Muhammed Ali", departmentId: "dept_cs", institutionId: "inst_gamma" },
    ];

    const computedItems = [];

    for (const h of targets) {
      // 1. Task completion rate for HOD's department
      let taskCompletionRate = 85.0;
      if (h.departmentId) {
        const deptTasks = await db
          .select({ status: tasks.status })
          .from(tasks)
          .where(eq(tasks.departmentId, h.departmentId))
          .all();
        if (deptTasks.length > 0) {
          const completed = deptTasks.filter((t) => t.status === "completed").length;
          taskCompletionRate = Math.round((completed / deptTasks.length) * 10000) / 100;
        }
      }

      // 2. Attendance rate for HOD
      let attendanceRate = 95.0;
      const atts = await db
        .select({ status: attendanceLogs.status })
        .from(attendanceLogs)
        .where(eq(attendanceLogs.staffId, h.id))
        .all();
      if (atts.length > 0) {
        const present = atts.filter((a) => a.status === "present").length;
        attendanceRate = Math.round((present / atts.length) * 10000) / 100;
      }

      // 3. Review rating
      let reviewRating = 4.2;
      const reviews = await db
        .select({ rating: performanceReviews.rating })
        .from(performanceReviews)
        .where(eq(performanceReviews.staffId, h.id))
        .all();
      if (reviews.length > 0 && reviews[0].rating) {
        reviewRating = reviews[0].rating;
      }

      // Discipline name
      const discipline = options.discipline || (h.departmentId?.includes("math") ? "Mathematics" : "Computer Science");

      // Composite score = (taskCompletionRate * 0.4) + (attendanceRate * 0.3) + ((reviewRating / 5) * 100 * 0.3)
      const compositeScore = Math.round(
        (taskCompletionRate * 0.4 + attendanceRate * 0.3 + (reviewRating / 5.0) * 100 * 0.3) * 100
      ) / 100;

      computedItems.push({
        hodStaffId: h.id,
        hodName: h.name,
        discipline,
        institutionId: h.institutionId || "inst_default",
        compositeScore,
        performanceFactors: {
          taskCompletionRate,
          attendanceRate,
          reviewRating,
        },
      });
    }

    // Sort descending by composite score
    computedItems.sort((a, b) => b.compositeScore - a.compositeScore);

    const rankings: HodRankingRecord[] = [];
    const limit = options.limit || 50;

    for (let idx = 0; idx < Math.min(computedItems.length, limit); idx++) {
      const item = computedItems[idx];
      const rankPosition = idx + 1;

      const recordId = `hod_rank_${options.regionalGroupId}_${item.hodStaffId}`;
      const record = {
        hodStaffId: item.hodStaffId,
        hodName: item.hodName,
        discipline: item.discipline,
        institutionId: item.institutionId,
        compositeScore: item.compositeScore,
        rankPosition,
        performanceFactors: item.performanceFactors,
      };

      await db.delete(regionalHodRankings).where(eq(regionalHodRankings.id, recordId)).run();
      await db.insert(regionalHodRankings).values({
        id: recordId,
        regionalGroupId: options.regionalGroupId,
        institutionId: item.institutionId,
        hodStaffId: item.hodStaffId,
        discipline: item.discipline,
        compositeScore: item.compositeScore,
        rankPosition,
        performanceFactors: JSON.stringify(item.performanceFactors),
        evaluatedAt: new Date().toISOString(),
      }).run();

      rankings.push(record);
    }

    return rankings;
  }
}
