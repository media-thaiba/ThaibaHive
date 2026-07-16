import { Router } from "express";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const items = await db.select().from(tables.notifications).where(eq(tables.notifications.staffId, req.user!.id)).orderBy(desc(tables.notifications.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.notifications).where(eq(tables.notifications.staffId, req.user!.id)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

notificationsRouter.put("/:id/read", async (req: AuthRequest, res) => {
  try {
    await db.update(tables.notifications).set({ isRead: true }).where(and(eq(tables.notifications.id, req.params.id), eq(tables.notifications.staffId, req.user!.id))).run();
    res.json({ message: "Marked as read" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

notificationsRouter.put("/read-all", async (req: AuthRequest, res) => {
  try {
    await db.update(tables.notifications).set({ isRead: true }).where(eq(tables.notifications.staffId, req.user!.id)).run();
    res.json({ message: "All marked as read" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

notificationsRouter.get("/unread-count", async (req: AuthRequest, res) => {
  try {
    const totalResult = await db.select({ count: count() }).from(tables.notifications).where(and(eq(tables.notifications.staffId, req.user!.id), eq(tables.notifications.isRead, false))).get();
    const unreadCount = totalResult?.count ?? 0;
    res.json({ count: unreadCount });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
