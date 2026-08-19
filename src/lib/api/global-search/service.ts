/* Global Search service implementation for P4-101 */

import { db } from "@/db";
import { staff, students, tasks, events, announcements } from "@/db/schema";
import { ilike, or, sql } from "drizzle-orm";
import {  } from "@/lib/validation/schemas";

export interface GlobalSearchResult {
  students: any[];
  staff: any[];
  tasks: any[];
  events: any[];
  announcements: any[];
  totalResults: number;
}

export async function globalSearch(
  query: string,
  entityTypes: string[] = ["students", "staff", "tasks", "events"],
  page = 1,
  limit = 20
): Promise<GlobalSearchResult> {
  const skipPagination = false; // Always skip for now to focus on search
  const offset = skipPagination ? 0 : (page - 1) * limit;

  const results: GlobalSearchResult = {
    students: [],
    staff: [],
    tasks: [],
    events: [],
    announcements: [],
    totalResults: 0,
  };

  try {
    // Search students
    if (entityTypes.includes("students")) {
      const studentResults = await db
        .select()
        .from(students)
        .where(
          or(
            ilike(students.firstName, `%${query}%`),
            ilike(students.lastName, `%${query}%`),
            ilike(students.admissionNo, `%${query}%`),
            ilike(students.email, `%${query}%`)
          )
        )
        .limit(skipPagination ? 999999 : limit)
        .offset(skipPagination ? 0 : offset)
        .all();
      results.students = studentResults;
    }

    // Search staff
    if (entityTypes.includes("staff")) {
      const staffResults = await db
        .select()
        .from(staff)
        .where(
          or(
            ilike(staff.firstName, `%${query}%`),
            ilike(staff.lastName, `%${query}%`),
            ilike(staff.email, `%${query}%`),
            ilike(staff.employeeId, `%${query}%`)
          )
        )
        .limit(skipPagination ? 999999 : limit)
        .offset(skipPagination ? 0 : offset)
        .all();
      results.staff = staffResults;
    }

    // Search tasks
    if (entityTypes.includes("tasks")) {
      const taskResults = await db
        .select()
        .from(tasks)
        .where(
          or(
            ilike(tasks.title, `%${query}%`),
            ilike(tasks.description, `%${query}%`)
          )
        )
        .limit(skipPagination ? 999999 : limit)
        .offset(skipPagination ? 0 : offset)
        .all();
      results.tasks = taskResults;
    }

    // Search events
    if (entityTypes.includes("events")) {
      const eventResults = await db
        .select()
        .from(events)
        .where(
          or(
            ilike(events.title, `%${query}%`),
            ilike(events.description, `%${query}%`),
            ilike(events.eventType, `%${query}%`)
          )
        )
        .limit(skipPagination ? 999999 : limit)
        .offset(skipPagination ? 0 : offset)
        .all();
      results.events = eventResults;
    }

    // Search announcements
    if (entityTypes.includes("announcements")) {
      const announcementResults = await db
        .select()
        .from(announcements)
        .where(
          or(
            ilike(announcements.title, `%${query}%`),
            ilike(announcements.content, `%${query}%`)
          )
        )
        .limit(skipPagination ? 999999 : limit)
        .offset(skipPagination ? 0 : offset)
        .all();
      results.announcements = announcementResults;
    }

    // Calculate total results
    let totalCount = 0;
    if (entityTypes.includes("students")) {
      const studentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(
          or(
            ilike(students.firstName, `%${query}%`),
            ilike(students.lastName, `%${query}%`),
            ilike(students.admissionNo, `%${query}%`),
            ilike(students.email, `%${query}%`)
          )
        )
        .get();
      totalCount += studentCount?.count || 0;
    }
    if (entityTypes.includes("staff")) {
      const staffCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(staff)
        .where(
          or(
            ilike(staff.firstName, `%${query}%`),
            ilike(staff.lastName, `%${query}%`),
            ilike(staff.email, `%${query}%`),
            ilike(staff.employeeId, `%${query}%`)
          )
        )
        .get();
      totalCount += staffCount?.count || 0;
    }
    if (entityTypes.includes("tasks")) {
      const taskCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(
          or(
            ilike(tasks.title, `%${query}%`),
            ilike(tasks.description, `%${query}%`)
          )
        )
        .get();
      totalCount += taskCount?.count || 0;
    }
    if (entityTypes.includes("events")) {
      const eventCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          or(
            ilike(events.title, `%${query}%`),
            ilike(events.description, `%${query}%`),
            ilike(events.eventType, `%${query}%`)
          )
        )
        .get();
      totalCount += eventCount?.count || 0;
    }
    if (entityTypes.includes("announcements")) {
      const announcementCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(announcements)
        .where(
          or(
            ilike(announcements.title, `%${query}%`),
            ilike(announcements.content, `%${query}%`)
          )
        )
        .get();
      totalCount += announcementCount?.count || 0;
    }

    results.totalResults = totalCount;
    return results;

  } catch (error) {
    console.error("Global search error:", error);
    return results;
  }
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  const suggestions: Set<string> = new Set();

  try {
    // Get student name suggestions
    const studentNames = await db
      .selectDistinct({ suggestion: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})` })
      .from(students)
      .where(ilike(students.firstName, `%${query}%`))
      .limit(5)
      .all();
    studentNames.forEach((item: any) => suggestions.add(item.suggestion));

    // Get staff name suggestions
    const staffNames = await db
      .selectDistinct({ suggestion: sql<string>`concat(${staff.firstName}, ' ', ${staff.lastName})` })
      .from(staff)
      .where(ilike(staff.firstName, `%${query}%`))
      .limit(5)
      .all();
    staffNames.forEach((item: any) => suggestions.add(item.suggestion));

    return Array.from(suggestions).slice(0, 10);

  } catch (error) {
    console.error("Search suggestions error:", error);
    return [];
  }
}