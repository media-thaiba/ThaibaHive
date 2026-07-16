import { Router } from "express";
import { db, tables } from "../../db";
import { eq, and, gte, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/stats", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const pendingLeaves = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.status, "pending")).all();
    const pendingTasks = await db.select().from(tables.tasks).where(and(eq(tables.tasks.assignedToId, req.user!.id), eq(tables.tasks.status, "todo"))).all();
    const attendanceToday = await db.select().from(tables.attendanceLogs).where(eq(tables.attendanceLogs.date, today)).all();
    const announcements = await db.select().from(tables.announcements).where(eq(tables.announcements.isActive, true)).orderBy(desc(tables.announcements.createdAt)).limit(5).all();
    res.json({
      pendingLeaves: pendingLeaves.length,
      pendingTasks: pendingTasks.length,
      attendanceToday: attendanceToday.length,
      announcements,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.get("/upcoming", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const upcomingEvents = await db.select().from(tables.events).where(and(eq(tables.events.isActive, true), gte(tables.events.startDate, today))).orderBy(tables.events.startDate).limit(5).all();
    const tasksDue = await db.select().from(tables.tasks).where(and(eq(tables.tasks.assignedToId, req.user!.id), eq(tables.tasks.status, "todo"))).orderBy(tables.tasks.dueDate).limit(5).all();
    res.json({ upcomingEvents, tasksDue });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
