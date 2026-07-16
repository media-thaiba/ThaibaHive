import { Router } from "express";
import { db, tables } from "../../db";
import { eq, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const timelineRouter = Router();
timelineRouter.use(authenticate);

timelineRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [attendances, tasks, leaves, announcements] = await Promise.all([
      db.select().from(tables.attendanceLogs).where(eq(tables.attendanceLogs.staffId, req.user!.id)).orderBy(desc(tables.attendanceLogs.createdAt)).limit(limit).all(),
      db.select().from(tables.tasks).where(eq(tables.tasks.assignedToId, req.user!.id)).orderBy(desc(tables.tasks.createdAt)).limit(limit).all(),
      db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.staffId, req.user!.id)).orderBy(desc(tables.leaveRequests.createdAt)).limit(limit).all(),
      db.select().from(tables.announcements).where(eq(tables.announcements.isActive, true)).orderBy(desc(tables.announcements.createdAt)).limit(limit).all(),
    ]);

    const activity: any[] = [
      ...attendances.map(a => ({ type: "attendance", action: a.checkIn ? (a.checkOut ? "checked-out" : "checked-in") : "marked", date: a.createdAt, data: a })),
      ...tasks.map(t => ({ type: "task", action: "created/updated", date: t.createdAt, data: t })),
      ...leaves.map(l => ({ type: "leave", action: `applied (${l.status})`, date: l.createdAt, data: l })),
      ...announcements.map(a => ({ type: "announcement", action: "published", date: a.createdAt, data: a })),
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = activity.length;
    const data = activity.slice(0, limit);
    res.json({ data, total, page, limit });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
