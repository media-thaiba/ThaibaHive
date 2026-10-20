import { db } from "@/db";
import {
  regionalHodRankings,
  staff,
  tasks,
  attendanceLogs,
  performanceReviews,
  staffInstitutions,
  staffDepartments,
  departments,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
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
   * Calculate regional HOD rankings and discipline analytics without polluting production tables.
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

    if (hodList.length === 0) {
      return [];
    }

    const hodIds = hodList.map((h) => h.id);

    // Batch-load institution and department mappings for all HODs
    const [instMappings, deptMappings] = await Promise.all([
      db
        .select({ staffId: staffInstitutions.staffId, institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(inArray(staffInstitutions.staffId, hodIds))
        .all(),
      db
        .select({
          staffId: staffDepartments.staffId,
          departmentId: staffDepartments.departmentId,
          deptName: departments.name,
        })
        .from(staffDepartments)
        .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(inArray(staffDepartments.staffId, hodIds))
        .all(),
    ]);

    const instByStaff = new Map<string, string>();
    for (const row of instMappings) {
      if (!instByStaff.has(row.staffId)) {
        instByStaff.set(row.staffId, row.institutionId);
      }
    }

    const deptByStaff = new Map<string, { departmentId: string; deptName: string | null }>();
    for (const row of deptMappings) {
      if (!deptByStaff.has(row.staffId)) {
        deptByStaff.set(row.staffId, { departmentId: row.departmentId, deptName: row.deptName });
      }
    }

    const targets = hodList.map((h) => {
      const deptInfo = deptByStaff.get(h.id);
      return {
        id: h.id,
        name: `${h.firstName} ${h.lastName}`,
        departmentId: deptInfo?.departmentId || null,
        deptName: deptInfo?.deptName || null,
        institutionId: instByStaff.get(h.id) || "inst_default",
      };
    });

    const deptIds = [...new Set(targets.map((t) => t.departmentId).filter((id): id is string => !!id))];

    const [allDeptTasks, allAtts, allReviews] = await Promise.all([
      deptIds.length > 0
        ? db
            .select({ departmentId: tasks.departmentId, status: tasks.status })
            .from(tasks)
            .where(inArray(tasks.departmentId, deptIds))
            .all()
        : Promise.resolve([]),
      db
        .select({ staffId: attendanceLogs.staffId, status: attendanceLogs.status })
        .from(attendanceLogs)
        .where(inArray(attendanceLogs.staffId, hodIds))
        .all(),
      db
        .select({ staffId: performanceReviews.staffId, rating: performanceReviews.rating })
        .from(performanceReviews)
        .where(inArray(performanceReviews.staffId, hodIds))
        .all(),
    ]);

    const computedItems = [];

    for (const h of targets) {
      let taskCompletionRate = 85.0;
      if (h.departmentId) {
        const deptTasks = allDeptTasks.filter((t) => t.departmentId === h.departmentId);
        if (deptTasks.length > 0) {
          const completed = deptTasks.filter((t) => t.status === "completed" || t.status === "done").length;
          taskCompletionRate = Math.round((completed / deptTasks.length) * 10000) / 100;
        }
      }

      let attendanceRate = 95.0;
      const atts = allAtts.filter((a) => a.staffId === h.id);
      if (atts.length > 0) {
        const present = atts.filter((a) => a.status === "present").length;
        attendanceRate = Math.round((present / atts.length) * 10000) / 100;
      }

      let reviewRating = 4.2;
      const reviews = allReviews.filter((r) => r.staffId === h.id);
      if (reviews.length > 0 && reviews[0].rating) {
        reviewRating = reviews[0].rating;
      }

      const discipline =
        options.discipline ||
        h.deptName ||
        (h.departmentId?.includes("math") ? "Mathematics" : "Computer Science");

      const compositeScore =
        Math.round(
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
      await db
        .insert(regionalHodRankings)
        .values({
          id: recordId,
          regionalGroupId: options.regionalGroupId,
          institutionId: item.institutionId,
          hodStaffId: item.hodStaffId,
          discipline: item.discipline,
          compositeScore: item.compositeScore,
          rankPosition,
          performanceFactors: JSON.stringify(item.performanceFactors),
          evaluatedAt: new Date().toISOString(),
        })
        .run();

      rankings.push(record);
    }

    return rankings;
  }
}
