import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const announcementsRouter = Router();
announcementsRouter.use(authenticate);

announcementsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { priority, targetRole, targetDepartmentId, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.announcements.isActive, true)];
    if (priority) conditions.push(eq(tables.announcements.priority, priority as string));
    if (targetRole) conditions.push(eq(tables.announcements.targetRole, targetRole as string));
    if (targetDepartmentId) conditions.push(eq(tables.announcements.targetDepartmentId, targetDepartmentId as string));
    const items = await db.select().from(tables.announcements).where(and(...conditions)).orderBy(desc(tables.announcements.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.announcements).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

announcementsRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, content, priority, targetRole, targetDepartmentId, targetInstitutionId, pinnedUntil } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and content required" });
    const id = uuid();
    await db.insert(tables.announcements).values({ id, title, content, priority: priority || "normal", targetRole, targetDepartmentId, targetInstitutionId, createdById: req.user!.id, pinnedUntil }).run();
    const item = await db.select().from(tables.announcements).where(eq(tables.announcements.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

announcementsRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, content, priority, isActive, pinnedUntil } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.isActive = isActive;
    if (pinnedUntil !== undefined) updates.pinnedUntil = pinnedUntil;
    await db.update(tables.announcements).set(updates).where(eq(tables.announcements.id, req.params.id)).run();
    const item = await db.select().from(tables.announcements).where(eq(tables.announcements.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

announcementsRouter.delete("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.announcements).where(eq(tables.announcements.id, req.params.id)).run();
    res.json({ message: "Announcement deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

announcementsRouter.post("/:id/read", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.announcementReads).where(and(eq(tables.announcementReads.announcementId, req.params.id), eq(tables.announcementReads.staffId, req.user!.id))).get();
    if (existing) return res.json(existing);
    const id = uuid();
    await db.insert(tables.announcementReads).values({ id, announcementId: req.params.id, staffId: req.user!.id }).run();
    const read = await db.select().from(tables.announcementReads).where(eq(tables.announcementReads.id, id)).get();
    res.status(201).json(read);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
