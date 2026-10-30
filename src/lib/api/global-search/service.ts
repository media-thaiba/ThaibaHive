/* Global Search service implementation - 15 Entity Types with Tenant Scoping & Sensitive Field Exclusion */

import { db, isPostgres } from "@/db";
import {
  staff,
  students,
  tasks,
  events,
  announcements,
  dailyReports,
  purchaseRequests,
  helpDeskTickets,
  staffRecognition,
  assets,
  circulars,
  bookings,
  polls,
  taskComments,
  mediaAssets,
  staffInstitutions,
} from "@/db/schema";
import { like, ilike, or, and, eq, inArray, isNull, type Column, type SQL } from "drizzle-orm";
import type {
  EntityType,
  SearchResultItem,
  GlobalSearchResult,
} from "./types";
import { ENTITY_ROUTE_STRATEGY_MAP } from "./types";

function searchPattern(col: Column | SQL, query: string) {
  const pattern = `%${query}%`;
  return isPostgres ? ilike(col, pattern) : like(col, pattern);
}

function calculateScore(text: string | null | undefined, query: string): number {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerText === lowerQuery) return 100;
  if (lowerText.startsWith(lowerQuery)) return 80;
  if (lowerText.includes(lowerQuery)) return 50;
  return 20;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
}

export async function globalSearch(
  query: string,
  entityTypes: EntityType[] = [
    "students",
    "staff",
    "tasks",
    "events",
    "announcements",
    "daily-reports",
    "purchase-requests",
    "help-desk-tickets",
    "recognition",
    "asset-inventory",
    "circulars",
    "bookings",
    "polls",
    "comments",
    "media-assets",
  ],
  page = 1,
  limit = 10,
  scopedInstitutionId?: string | null
): Promise<GlobalSearchResult> {
  const effectiveLimit = Math.min(Math.max(1, limit || 10), 20);
  const offset = Math.max(0, (page - 1) * effectiveLimit);
  const trimmedQuery = query.trim();

  const results: GlobalSearchResult = {
    students: [],
    staff: [],
    tasks: [],
    events: [],
    announcements: [],
    "daily-reports": [],
    "purchase-requests": [],
    "help-desk-tickets": [],
    recognition: [],
    "asset-inventory": [],
    circulars: [],
    bookings: [],
    polls: [],
    comments: [],
    "media-assets": [],
    totalResults: 0,
  };

  if (!trimmedQuery) {
    return results;
  }

  const isGlobal = !scopedInstitutionId || scopedInstitutionId === "global";

  const searchExecution = async (): Promise<GlobalSearchResult> => {
    const searchPromises: Promise<void>[] = [];

    // Helper for staff scoped subquery
    const scopedStaffSubquery = !isGlobal
      ? db
          .select({ staffId: staffInstitutions.staffId })
          .from(staffInstitutions)
          .where(eq(staffInstitutions.institutionId, scopedInstitutionId!))
      : null;

    // 1. Students
    if (entityTypes.includes("students")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(students.firstName, trimmedQuery),
              searchPattern(students.lastName, trimmedQuery),
              searchPattern(students.admissionNo, trimmedQuery),
              searchPattern(students.email, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(students.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: students.id,
              firstName: students.firstName,
              lastName: students.lastName,
              admissionNo: students.admissionNo,
              email: students.email,
              classId: students.classId,
              avatarUrl: students.avatarUrl,
              isActive: students.isActive,
              institutionId: students.institutionId,
            })
            .from(students)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.students = rows.map((r) => {
            const fullName = `${r.firstName} ${r.lastName}`.trim();
            return {
              id: r.id,
              entityType: "students",
              title: fullName,
              subtitle: `Adm: ${r.admissionNo} • ${r.email || "No Email"}`,
              avatarUrl: r.avatarUrl,
              initials: getInitials(fullName),
              nativeRoute: `/students/${r.id}`,
              webRoute: `/school/students/${r.id}`,
              targetPath: `/school/students/${r.id}`,
              isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["students"] === "handoff",
              score: Math.max(
                calculateScore(fullName, trimmedQuery),
                calculateScore(r.admissionNo, trimmedQuery)
              ),
              metadata: { admissionNo: r.admissionNo, classId: r.classId },
            };
          });
        })()
      );
    }

    // 2. Staff
    if (entityTypes.includes("staff")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(staff.firstName, trimmedQuery),
              searchPattern(staff.lastName, trimmedQuery),
              searchPattern(staff.email, trimmedQuery),
              searchPattern(staff.employeeId, trimmedQuery),
              searchPattern(staff.designation, trimmedQuery)
            ),
          ];
          if (!isGlobal && scopedStaffSubquery) {
            conditions.push(inArray(staff.id, scopedStaffSubquery));
          }

          const rows = await db
            .select({
              id: staff.id,
              firstName: staff.firstName,
              lastName: staff.lastName,
              email: staff.email,
              employeeId: staff.employeeId,
              designation: staff.designation,
              role: staff.role,
              avatarUrl: staff.avatarUrl,
              isActive: staff.isActive,
            })
            .from(staff)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.staff = rows.map((r) => {
            const fullName = `${r.firstName} ${r.lastName}`.trim();
            return {
              id: r.id,
              entityType: "staff",
              title: fullName,
              subtitle: `${r.designation || r.role} • ${r.employeeId}`,
              avatarUrl: r.avatarUrl,
              initials: getInitials(fullName),
              nativeRoute: `/staff/${r.id}`,
              webRoute: `/school/staff/${r.id}`,
              targetPath: `/school/staff/${r.id}`,
              isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["staff"] === "handoff",
              score: Math.max(
                calculateScore(fullName, trimmedQuery),
                calculateScore(r.employeeId, trimmedQuery)
              ),
              metadata: { employeeId: r.employeeId, role: r.role },
            };
          });
        })()
      );
    }

    // 3. Tasks
    if (entityTypes.includes("tasks")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(tasks.title, trimmedQuery),
              searchPattern(tasks.description, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(tasks.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: tasks.id,
              title: tasks.title,
              description: tasks.description,
              status: tasks.status,
              priority: tasks.priority,
              dueDate: tasks.dueDate,
              assignedToId: tasks.assignedToId,
              institutionId: tasks.institutionId,
              createdAt: tasks.createdAt,
            })
            .from(tasks)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.tasks = rows.map((r) => ({
            id: r.id,
            entityType: "tasks",
            title: r.title,
            subtitle: `Priority: ${r.priority} • Status: ${r.status}`,
            initials: getInitials(r.title),
            nativeRoute: `/tasks/${r.id}`,
            webRoute: `/my-work/tasks?taskId=${r.id}`,
            targetPath: `/my-work/tasks?taskId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["tasks"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { status: r.status, priority: r.priority },
          }));
        })()
      );
    }

    // 4. Events
    if (entityTypes.includes("events")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(events.title, trimmedQuery),
              searchPattern(events.description, trimmedQuery),
              searchPattern(events.eventType, trimmedQuery),
              searchPattern(events.location, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(or(eq(events.institutionId, scopedInstitutionId!), isNull(events.institutionId))!);
          }

          const rows = await db
            .select({
              id: events.id,
              title: events.title,
              description: events.description,
              eventType: events.eventType,
              startDate: events.startDate,
              endDate: events.endDate,
              location: events.location,
              institutionId: events.institutionId,
              isActive: events.isActive,
            })
            .from(events)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.events = rows.map((r) => ({
            id: r.id,
            entityType: "events",
            title: r.title,
            subtitle: `${r.eventType} • ${r.startDate ? r.startDate.split("T")[0] : ""}`,
            initials: getInitials(r.title),
            nativeRoute: `/events/${r.id}`,
            webRoute: `/operations/events?eventId=${r.id}`,
            targetPath: `/operations/events?eventId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["events"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { eventType: r.eventType, startDate: r.startDate },
          }));
        })()
      );
    }

    // 5. Announcements
    if (entityTypes.includes("announcements")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(announcements.title, trimmedQuery),
              searchPattern(announcements.content, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(or(eq(announcements.targetInstitutionId, scopedInstitutionId!), isNull(announcements.targetInstitutionId))!);
          }

          const rows = await db
            .select({
              id: announcements.id,
              title: announcements.title,
              content: announcements.content,
              priority: announcements.priority,
              targetRole: announcements.targetRole,
              targetInstitutionId: announcements.targetInstitutionId,
              createdAt: announcements.createdAt,
              isActive: announcements.isActive,
            })
            .from(announcements)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.announcements = rows.map((r) => ({
            id: r.id,
            entityType: "announcements",
            title: r.title,
            subtitle: `Priority: ${r.priority} • ${r.createdAt ? r.createdAt.split("T")[0] : ""}`,
            initials: getInitials(r.title),
            nativeRoute: `/announcements/${r.id}`,
            webRoute: `/operations/announcements?announcementId=${r.id}`,
            targetPath: `/operations/announcements?announcementId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["announcements"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { priority: r.priority },
          }));
        })()
      );
    }

    // 6. Daily Reports
    if (entityTypes.includes("daily-reports")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(dailyReports.summary, trimmedQuery),
              searchPattern(dailyReports.reviewerComment, trimmedQuery),
              searchPattern(dailyReports.date, trimmedQuery)
            ),
          ];
          if (!isGlobal && scopedStaffSubquery) {
            conditions.push(inArray(dailyReports.staffId, scopedStaffSubquery));
          }

          const rows = await db
            .select({
              id: dailyReports.id,
              staffId: dailyReports.staffId,
              date: dailyReports.date,
              summary: dailyReports.summary,
              status: dailyReports.status,
              reviewerComment: dailyReports.reviewerComment,
              createdAt: dailyReports.createdAt,
            })
            .from(dailyReports)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results["daily-reports"] = rows.map((r) => ({
            id: r.id,
            entityType: "daily-reports",
            title: `Daily Report: ${r.date}`,
            subtitle: `${r.status} • ${r.summary ? r.summary.substring(0, 50) + "..." : "No summary"}`,
            initials: "DR",
            nativeRoute: `/daily-reports/${r.id}`,
            webRoute: `/my-work/daily-reports?reportId=${r.id}`,
            targetPath: `/my-work/daily-reports?reportId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["daily-reports"] === "handoff",
            score: calculateScore(r.summary, trimmedQuery),
            metadata: { date: r.date, status: r.status },
          }));
        })()
      );
    }

    // 7. Purchase Requests (Handoff entity)
    if (entityTypes.includes("purchase-requests")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(purchaseRequests.itemName, trimmedQuery),
              searchPattern(purchaseRequests.justification, trimmedQuery),
              searchPattern(purchaseRequests.notes, trimmedQuery)
            ),
          ];
          if (!isGlobal && scopedStaffSubquery) {
            conditions.push(inArray(purchaseRequests.requesterId, scopedStaffSubquery));
          }

          const rows = await db
            .select({
              id: purchaseRequests.id,
              requesterId: purchaseRequests.requesterId,
              itemName: purchaseRequests.itemName,
              quantity: purchaseRequests.quantity,
              estimatedCost: purchaseRequests.estimatedCost,
              status: purchaseRequests.status,
              createdAt: purchaseRequests.createdAt,
            })
            .from(purchaseRequests)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results["purchase-requests"] = rows.map((r) => ({
            id: r.id,
            entityType: "purchase-requests",
            title: r.itemName,
            subtitle: `Qty: ${r.quantity} • Cost: ₹${r.estimatedCost ?? 0} • ${r.status}`,
            initials: getInitials(r.itemName),
            nativeRoute: `/handoff?path=/finance/purchases&title=${encodeURIComponent(r.itemName)}`,
            webRoute: `/admin/finance/purchases?requestId=${r.id}`,
            targetPath: `/admin/finance/purchases?requestId=${r.id}`,
            isWebOnly: true,
            score: calculateScore(r.itemName, trimmedQuery),
            metadata: { status: r.status, cost: r.estimatedCost },
          }));
        })()
      );
    }

    // 8. Help Desk Tickets
    if (entityTypes.includes("help-desk-tickets")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(helpDeskTickets.title, trimmedQuery),
              searchPattern(helpDeskTickets.description, trimmedQuery),
              searchPattern(helpDeskTickets.category, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(helpDeskTickets.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: helpDeskTickets.id,
              title: helpDeskTickets.title,
              description: helpDeskTickets.description,
              category: helpDeskTickets.category,
              priority: helpDeskTickets.priority,
              status: helpDeskTickets.status,
              submittedById: helpDeskTickets.submittedById,
              institutionId: helpDeskTickets.institutionId,
              createdAt: helpDeskTickets.createdAt,
            })
            .from(helpDeskTickets)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results["help-desk-tickets"] = rows.map((r) => ({
            id: r.id,
            entityType: "help-desk-tickets",
            title: r.title,
            subtitle: `[${r.category}] Priority: ${r.priority} • ${r.status}`,
            initials: getInitials(r.title),
            nativeRoute: `/help-desk/${r.id}`,
            webRoute: `/operations/help-desk?ticketId=${r.id}`,
            targetPath: `/operations/help-desk?ticketId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["help-desk-tickets"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { category: r.category, status: r.status },
          }));
        })()
      );
    }

    // 9. Recognition
    if (entityTypes.includes("recognition")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(staffRecognition.recognitionType, trimmedQuery),
              searchPattern(staffRecognition.message, trimmedQuery)
            ),
          ];
          if (!isGlobal && scopedStaffSubquery) {
            conditions.push(inArray(staffRecognition.staffId, scopedStaffSubquery));
          }

          const rows = await db
            .select({
              id: staffRecognition.id,
              staffId: staffRecognition.staffId,
              recognitionType: staffRecognition.recognitionType,
              message: staffRecognition.message,
              recognizedById: staffRecognition.recognizedById,
              date: staffRecognition.date,
              createdAt: staffRecognition.createdAt,
            })
            .from(staffRecognition)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.recognition = rows.map((r) => ({
            id: r.id,
            entityType: "recognition",
            title: `Recognition: ${r.recognitionType}`,
            subtitle: `${r.date} • ${r.message ? r.message.substring(0, 50) : ""}`,
            initials: getInitials(r.recognitionType),
            nativeRoute: `/recognition/${r.id}`,
            webRoute: `/operations/recognition?recognitionId=${r.id}`,
            targetPath: `/operations/recognition?recognitionId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["recognition"] === "handoff",
            score: calculateScore(r.recognitionType, trimmedQuery),
            metadata: { date: r.date, type: r.recognitionType },
          }));
        })()
      );
    }

    // 10. Asset Inventory
    if (entityTypes.includes("asset-inventory")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(assets.name, trimmedQuery),
              searchPattern(assets.type, trimmedQuery),
              searchPattern(assets.model, trimmedQuery),
              searchPattern(assets.serialNumber, trimmedQuery),
              searchPattern(assets.location, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(assets.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: assets.id,
              name: assets.name,
              type: assets.type,
              model: assets.model,
              serialNumber: assets.serialNumber,
              location: assets.location,
              status: assets.status,
              institutionId: assets.institutionId,
              isActive: assets.isActive,
            })
            .from(assets)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results["asset-inventory"] = rows.map((r) => ({
            id: r.id,
            entityType: "asset-inventory",
            title: r.name,
            subtitle: `${r.type} • Loc: ${r.location || "N/A"} • S/N: ${r.serialNumber || "N/A"}`,
            initials: getInitials(r.name),
            nativeRoute: `/assets/${r.id}`,
            webRoute: `/operations/assets?assetId=${r.id}`,
            targetPath: `/operations/assets?assetId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["asset-inventory"] === "handoff",
            score: calculateScore(r.name, trimmedQuery),
            metadata: { type: r.type, status: r.status },
          }));
        })()
      );
    }

    // 11. Circulars
    if (entityTypes.includes("circulars")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(circulars.title, trimmedQuery),
              searchPattern(circulars.description, trimmedQuery),
              searchPattern(circulars.category, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(or(eq(circulars.targetInstitutionId, scopedInstitutionId!), isNull(circulars.targetInstitutionId))!);
          }

          const rows = await db
            .select({
              id: circulars.id,
              title: circulars.title,
              description: circulars.description,
              fileUrl: circulars.fileUrl,
              fileType: circulars.fileType,
              category: circulars.category,
              targetInstitutionId: circulars.targetInstitutionId,
              createdAt: circulars.createdAt,
              isActive: circulars.isActive,
            })
            .from(circulars)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.circulars = rows.map((r) => ({
            id: r.id,
            entityType: "circulars",
            title: r.title,
            subtitle: `Category: ${r.category || "General"} • ${r.createdAt ? r.createdAt.split("T")[0] : ""}`,
            initials: getInitials(r.title),
            nativeRoute: `/circulars/${r.id}`,
            webRoute: `/operations/circulars?circularId=${r.id}`,
            targetPath: `/operations/circulars?circularId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["circulars"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { category: r.category, fileUrl: r.fileUrl },
          }));
        })()
      );
    }

    // 12. Bookings
    if (entityTypes.includes("bookings")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(bookings.title, trimmedQuery),
              searchPattern(bookings.notes, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(bookings.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: bookings.id,
              resourceId: bookings.resourceId,
              bookerId: bookings.bookerId,
              title: bookings.title,
              startTime: bookings.startTime,
              endTime: bookings.endTime,
              status: bookings.status,
              notes: bookings.notes,
              institutionId: bookings.institutionId,
            })
            .from(bookings)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.bookings = rows.map((r) => ({
            id: r.id,
            entityType: "bookings",
            title: r.title,
            subtitle: `Status: ${r.status} • ${r.startTime ? r.startTime.split("T")[0] : ""}`,
            initials: getInitials(r.title),
            nativeRoute: `/bookings/${r.id}`,
            webRoute: `/operations/bookings?bookingId=${r.id}`,
            targetPath: `/operations/bookings?bookingId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["bookings"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { status: r.status, startTime: r.startTime },
          }));
        })()
      );
    }

    // 13. Polls
    if (entityTypes.includes("polls")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(polls.title, trimmedQuery),
              searchPattern(polls.description, trimmedQuery),
              searchPattern(polls.question, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(or(eq(polls.targetInstitutionId, scopedInstitutionId!), isNull(polls.targetInstitutionId))!);
          }

          const rows = await db
            .select({
              id: polls.id,
              title: polls.title,
              description: polls.description,
              question: polls.question,
              expiresAt: polls.expiresAt,
              targetInstitutionId: polls.targetInstitutionId,
              isActive: polls.isActive,
              createdAt: polls.createdAt,
            })
            .from(polls)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.polls = rows.map((r) => ({
            id: r.id,
            entityType: "polls",
            title: r.title,
            subtitle: r.question.substring(0, 60),
            initials: getInitials(r.title),
            nativeRoute: `/polls/${r.id}`,
            webRoute: `/operations/polls?pollId=${r.id}`,
            targetPath: `/operations/polls?pollId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["polls"] === "handoff",
            score: calculateScore(r.title, trimmedQuery),
            metadata: { expiresAt: r.expiresAt },
          }));
        })()
      );
    }

    // 14. Comments (Task comments)
    if (entityTypes.includes("comments")) {
      searchPromises.push(
        (async () => {
          const conditions = [searchPattern(taskComments.content, trimmedQuery)];
          if (!isGlobal) {
            const scopedTaskSubquery = db
              .select({ id: tasks.id })
              .from(tasks)
              .where(eq(tasks.institutionId, scopedInstitutionId!));
            conditions.push(inArray(taskComments.taskId, scopedTaskSubquery));
          }

          const rows = await db
            .select({
              id: taskComments.id,
              taskId: taskComments.taskId,
              staffId: taskComments.staffId,
              content: taskComments.content,
              createdAt: taskComments.createdAt,
            })
            .from(taskComments)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results.comments = rows.map((r) => ({
            id: r.id,
            entityType: "comments",
            title: `Comment: ${r.content.substring(0, 40)}...`,
            subtitle: `Task: ${r.taskId} • ${r.createdAt ? r.createdAt.split("T")[0] : ""}`,
            initials: "CM",
            nativeRoute: `/tasks/${r.taskId}`,
            webRoute: `/my-work/tasks?taskId=${r.taskId}`,
            targetPath: `/my-work/tasks?taskId=${r.taskId}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["comments"] === "handoff",
            score: calculateScore(r.content, trimmedQuery),
            metadata: { taskId: r.taskId },
          }));
        })()
      );
    }

    // 15. Media Assets
    if (entityTypes.includes("media-assets")) {
      searchPromises.push(
        (async () => {
          const conditions = [
            or(
              searchPattern(mediaAssets.name, trimmedQuery),
              searchPattern(mediaAssets.fileType, trimmedQuery)
            ),
          ];
          if (!isGlobal) {
            conditions.push(eq(mediaAssets.institutionId, scopedInstitutionId!));
          }

          const rows = await db
            .select({
              id: mediaAssets.id,
              name: mediaAssets.name,
              fileUrl: mediaAssets.fileUrl,
              thumbnailUrl: mediaAssets.thumbnailUrl,
              fileSize: mediaAssets.fileSize,
              mimeType: mediaAssets.mimeType,
              fileType: mediaAssets.fileType,
              status: mediaAssets.status,
              institutionId: mediaAssets.institutionId,
              createdAt: mediaAssets.createdAt,
            })
            .from(mediaAssets)
            .where(and(...conditions))
            .limit(effectiveLimit)
            .offset(offset)
            .all();

          results["media-assets"] = rows.map((r) => ({
            id: r.id,
            entityType: "media-assets",
            title: r.name,
            subtitle: `${r.fileType.toUpperCase()} • ${(r.fileSize / 1024 / 1024).toFixed(2)} MB`,
            avatarUrl: r.thumbnailUrl || r.fileUrl,
            initials: getInitials(r.name),
            nativeRoute: `/media/${r.id}`,
            webRoute: `/operations/media?assetId=${r.id}`,
            targetPath: `/operations/media?assetId=${r.id}`,
            isWebOnly: ENTITY_ROUTE_STRATEGY_MAP["media-assets"] === "handoff",
            score: calculateScore(r.name, trimmedQuery),
            metadata: { fileType: r.fileType, mimeType: r.mimeType, size: r.fileSize },
          }));
        })()
      );
    }

    await Promise.all(searchPromises);

    // Calculate total count
    let totalCount = 0;
    for (const key of Object.keys(results) as (keyof GlobalSearchResult)[]) {
      if (key !== "totalResults" && Array.isArray(results[key])) {
        // Sort items in this bucket by score descending
        (results[key] as SearchResultItem[]).sort((a, b) => (b.score || 0) - (a.score || 0));
        totalCount += (results[key] as SearchResultItem[]).length;
      }
    }
    results.totalResults = totalCount;

    return results;
  };

  // 5-second query timeout safety
  const timeoutPromise = new Promise<GlobalSearchResult>((_, reject) => {
    setTimeout(() => reject(new Error("Search query timed out (5s exceeded)")), 5000);
  });

  try {
    return await Promise.race([searchExecution(), timeoutPromise]);
  } catch (error) {
    console.error("Global search execution error:", error);
    return results;
  }
}

export async function getSearchSuggestions(
  query: string,
  scopedInstitutionId?: string | null
): Promise<string[]> {
  const suggestions: Set<string> = new Set();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const isGlobal = !scopedInstitutionId || scopedInstitutionId === "global";

  try {
    // Build parallel suggestion queries (dispatched via Promise.all)
    const studentConditions = [
      or(searchPattern(students.firstName, trimmed), searchPattern(students.lastName, trimmed)),
    ];
    if (!isGlobal) {
      studentConditions.push(eq(students.institutionId, scopedInstitutionId!));
    }

    const staffConditions = [
      or(searchPattern(staff.firstName, trimmed), searchPattern(staff.lastName, trimmed)),
    ];
    if (!isGlobal) {
      const scopedStaff = db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, scopedInstitutionId!));
      staffConditions.push(inArray(staff.id, scopedStaff));
    }

    const taskConditions = [searchPattern(tasks.title, trimmed)];
    if (!isGlobal) {
      taskConditions.push(eq(tasks.institutionId, scopedInstitutionId!));
    }

    const [studentRows, staffRows, taskRows] = await Promise.all([
      db
        .select({
          firstName: students.firstName,
          lastName: students.lastName,
        })
        .from(students)
        .where(and(...studentConditions))
        .limit(5)
        .all(),
      db
        .select({
          firstName: staff.firstName,
          lastName: staff.lastName,
        })
        .from(staff)
        .where(and(...staffConditions))
        .limit(5)
        .all(),
      db
        .select({ title: tasks.title })
        .from(tasks)
        .where(and(...taskConditions))
        .limit(5)
        .all(),
    ]);

    studentRows.forEach((s) => {
      const name = `${s.firstName} ${s.lastName}`.trim();
      if (name) suggestions.add(name);
    });

    staffRows.forEach((s) => {
      const name = `${s.firstName} ${s.lastName}`.trim();
      if (name) suggestions.add(name);
    });

    taskRows.forEach((t) => suggestions.add(t.title));

    return Array.from(suggestions).slice(0, 10);
  } catch (error) {
    console.error("Search suggestions error:", error);
    return [];
  }
}