import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  staff,
  leaveRequests,
  tasks,
  notifications,
  attendanceLogs,
  announcements,
  events,
  eventRsvps,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, ne, sql, desc, gte } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  try {
    const { staffId } = session;

    // 1. Total staff count
    const staffCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .get();
    const totalStaff = staffCountRes?.count ?? 0;

    // 2. Pending leaves count
    let pendingLeaves = 0;
    if (session.role === "super_admin" || session.role === "admin" || session.role === "principal" || session.role === "hod") {
      const leavesCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, "pending"))
        .get();
      pendingLeaves = leavesCountRes?.count ?? 0;
    } else {
      const leavesCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.staffId, staffId), eq(leaveRequests.status, "pending")))
        .get();
      pendingLeaves = leavesCountRes?.count ?? 0;
    }

    // 3. Pending tasks for the current user (status != 'completed')
    const tasksCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.assignedToId, staffId), ne(tasks.status, "completed")))
      .get();
    const pendingTasks = tasksCountRes?.count ?? 0;

    // 4. Pending approvals (Approvals count for Admin/HOD, 0 for staff)
    let pendingApprovals = 0;
    if (session.role !== "staff") {
      const pendingLeavesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, "pending"))
        .get();
      pendingApprovals = pendingLeavesCount?.count ?? 0;
    }

    // 5. Unread notifications
    const unreadNotifRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.staffId, staffId), eq(notifications.isRead, false)))
      .get();
    const unreadNotifications = unreadNotifRes?.count ?? 0;

    // 6. Today's attendance log
    const today = new Date().toISOString().split("T")[0];
    const todayLog = await db
      .select()
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.staffId, staffId), eq(attendanceLogs.date, today)))
      .get() ?? null;

    const todayStatus = todayLog?.status ?? null;
    const todayCheckIn = todayLog?.checkIn ?? null;
    const todayCheckOut = todayLog?.checkOut ?? null;

    // 7. Recent announcements
    const announcementsList = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        priority: announcements.priority,
        isActive: announcements.isActive,
        createdAt: announcements.createdAt,
        createdById: announcements.createdById,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(announcements)
      .leftJoin(staff, eq(announcements.createdById, staff.id))
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt))
      .limit(5)
      .all();

    const recentAnnouncements = announcementsList.map((ann) => ({
      id: ann.id,
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      author_name: ann.firstName && ann.lastName ? `${ann.firstName} ${ann.lastName}` : "System",
      is_active: ann.isActive,
      is_pinned: false,
      created_at: ann.createdAt,
    }));

    // 8. Upcoming events
    const eventsList = await db
      .select()
      .from(events)
      .where(and(eq(events.isActive, true), gte(events.startDate, today)))
      .orderBy(events.startDate)
      .limit(5)
      .all();

    const upcomingEvents = await Promise.all(
      eventsList.map(async (ev) => {
        const attendeeCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.status, "going")))
          .get();

        const userRsvp = await db
          .select()
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.staffId, staffId)))
          .get() ?? null;

        return {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          event_date: ev.startDate,
          start_time: null,
          end_time: ev.endDate,
          location: ev.location,
          event_type: ev.eventType,
          attendee_count: attendeeCountRes?.count ?? 0,
          has_rsvp: userRsvp !== null,
          is_active: ev.isActive,
        };
      })
    );

    return NextResponse.json({
      total_staff: totalStaff,
      pending_leaves: pendingLeaves,
      pending_tasks: pendingTasks,
      pending_approvals: pendingApprovals,
      unread_notifications: unreadNotifications,
      today_status: todayStatus,
      today_check_in: todayCheckIn,
      today_check_out: todayCheckOut,
      recent_announcements: recentAnnouncements,
      upcoming_events: upcomingEvents,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
