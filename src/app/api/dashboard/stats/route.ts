import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  staff,
  staffInstitutions,
  leaveRequests,
  leaveBalances,
  leaveTypes,
  tasks,
  notifications,
  attendanceLogs,
  announcements,
  events,
  eventRsvps,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and, sql, desc, gte, inArray, or, isNull } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  try {
    const { staffId, role } = session;
    const isAdmin = role === "super_admin" || role === "admin" || role === "principal" || role === "hod";
    const today = new Date().toISOString().split("T")[0];

    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const activeScope = scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;

    // Run all independent queries in parallel
    const [
      staffCountRes,
      todayLog,
      myTasksRows,
      leaveCounts,
      balances,
      unreadNotifRes,
      announcementsList,
      eventsList,
      todayPresentCount,
      staffProfile,
    ] = await Promise.all([
      // 1. Staff count (scoped to institution via staffInstitutions junction)
      activeScope
        ? db.select({ count: sql<number>`count(${staffInstitutions.staffId})` })
            .from(staffInstitutions)
            .where(eq(staffInstitutions.institutionId, activeScope)).get()
        : db.select({ count: sql<number>`count(*)` }).from(staff).get(),

      // 2. Today's attendance log for current user
      db.select().from(attendanceLogs)
        .where(and(eq(attendanceLogs.staffId, staffId), eq(attendanceLogs.date, today)))
        .get(),

      // 3. All tasks assigned to current user
      db.select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        status: tasks.status,
      }).from(tasks)
        .where(eq(tasks.assignedToId, staffId))
        .all(),

      // 4. Pending leave counts (admin sees own institution, staff sees own)
      isAdmin
        ? db.select({ count: sql<number>`count(*)` }).from(leaveRequests)
            .where(and(
              eq(leaveRequests.status, "pending"),
              ...(activeScope ? [eq(leaveRequests.institutionId, activeScope)] : [])
            )).get()
        : db.select({ count: sql<number>`count(*)` }).from(leaveRequests)
            .where(and(eq(leaveRequests.staffId, staffId), eq(leaveRequests.status, "pending"))).get(),

      // 5. Leave balances for current user
      db.select({
        totalDays: leaveBalances.totalDays,
        usedDays: leaveBalances.usedDays,
      }).from(leaveBalances)
        .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
        .where(and(eq(leaveBalances.staffId, staffId), eq(leaveBalances.year, new Date().getFullYear())))
        .all(),

      // 6. Unread notifications
      db.select({ count: sql<number>`count(*)` }).from(notifications)
        .where(and(eq(notifications.staffId, staffId), eq(notifications.isRead, false)))
        .get(),

      // 7. Recent announcements (5)
      db.select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        priority: announcements.priority,
        isActive: announcements.isActive,
        createdAt: announcements.createdAt,
        firstName: staff.firstName,
        lastName: staff.lastName,
      }).from(announcements)
        .leftJoin(staff, eq(announcements.createdById, staff.id))
        .where(and(
          eq(announcements.isActive, true),
          ...(activeScope
            ? [or(isNull(announcements.targetInstitutionId), eq(announcements.targetInstitutionId, activeScope))!]
            : [])
        ))
        .orderBy(desc(announcements.createdAt))
        .limit(5)
        .all(),

      // 8. Upcoming events (5)
      db.select().from(events)
        .where(and(
          eq(events.isActive, true),
          gte(events.startDate, today),
          ...(activeScope
            ? [or(isNull(events.institutionId), eq(events.institutionId, activeScope))!]
            : [])
        ))
        .orderBy(events.startDate)
        .limit(5)
        .all(),

      // 9. Today's present count (for admin badge, scoped to institution staff)
      isAdmin
        ? activeScope
          ? db.select({ count: sql<number>`count(DISTINCT ${attendanceLogs.staffId})` })
              .from(attendanceLogs)
              .innerJoin(staffInstitutions, eq(attendanceLogs.staffId, staffInstitutions.staffId))
              .where(and(
                eq(staffInstitutions.institutionId, activeScope),
                eq(attendanceLogs.date, today),
                sql`${attendanceLogs.checkIn} IS NOT NULL`
              ))
              .get()
          : db.select({ count: sql<number>`count(DISTINCT ${attendanceLogs.staffId})` })
              .from(attendanceLogs)
              .where(and(eq(attendanceLogs.date, today), sql`${attendanceLogs.checkIn} IS NOT NULL`))
              .get()
        : Promise.resolve({ count: 0 }),

      // 10. Staff profile for completion check
      db.select({
        phone: staff.phone,
        designation: staff.designation,
        dateOfBirth: staff.dateOfBirth,
        qualifications: staff.qualifications,
        skills: staff.skills,
        emergencyContactName: staff.emergencyContactName,
        bankAccount: staff.bankAccount,
      }).from(staff).where(eq(staff.id, staffId)).get(),
    ]);

    // Derive task stats
    const pendingTasks = myTasksRows.filter((t) => t.status !== "completed");
    const completedTasks = myTasksRows.length - pendingTasks.length;

    // Derive leave stats
    const leaveTotal = balances.reduce((sum, b) => sum + (b.totalDays || 0), 0);
    const leaveUsed = balances.reduce((sum, b) => sum + (b.usedDays || 0), 0);
    const leaveRemaining = leaveTotal - leaveUsed;

    // Profile completion
    const profileFields = staffProfile
      ? [staffProfile.phone, staffProfile.designation, staffProfile.dateOfBirth, staffProfile.qualifications, staffProfile.skills, staffProfile.emergencyContactName, staffProfile.bankAccount]
      : [];
    const filledFields = profileFields.filter(Boolean).length;

    // Process events with RSVP counts
    const eventIds = eventsList.map((e) => e.id);
    let rsvpCounts: Record<string, number> = {};
    let userRsvps: Record<string, string> = {};

    if (eventIds.length > 0) {
      const [rsvpRows, userRsvpRows] = await Promise.all([
        db.select({ eventId: eventRsvps.eventId, count: sql<number>`count(*)` })
          .from(eventRsvps)
          .where(and(inArray(eventRsvps.eventId, eventIds), eq(eventRsvps.status, "going")))
          .groupBy(eventRsvps.eventId)
          .all(),
        db.select({ eventId: eventRsvps.eventId, status: eventRsvps.status })
          .from(eventRsvps)
          .where(and(inArray(eventRsvps.eventId, eventIds), eq(eventRsvps.staffId, staffId)))
          .all(),
      ]);
      rsvpCounts = Object.fromEntries(rsvpRows.map((r) => [r.eventId, r.count]));
      userRsvps = Object.fromEntries(userRsvpRows.map((r) => [r.eventId, r.status]));
    }

    const upcomingEvents = eventsList.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      event_date: ev.startDate,
      end_time: ev.endDate,
      location: ev.location,
      event_type: ev.eventType,
      attendee_count: rsvpCounts[ev.id] ?? 0,
      has_rsvp: ev.id in userRsvps,
      myRsvpStatus: userRsvps[ev.id] ?? null,
      is_active: ev.isActive,
    }));

    return NextResponse.json({
      staffCount: staffCountRes?.count ?? 0,
      todayPresent: todayPresentCount?.count ?? 0,
      pendingApprovals: leaveCounts?.count ?? 0,
      myPendingTasks: pendingTasks.length,
      completedTasks,
      totalTasks: myTasksRows.length,
      checkedInToday: !!todayLog?.checkIn,
      profileFields: { filled: filledFields, total: profileFields.length },
      leaveRemaining,
      leaveTotal,
      unreadNotifications: unreadNotifRes?.count ?? 0,
      activeTasks: pendingTasks.slice(0, 4),
      recentAnnouncements: announcementsList.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        author_name: a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : "System",
        is_active: a.isActive,
        created_at: a.createdAt,
      })),
      upcomingEvents,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "reports:read");

