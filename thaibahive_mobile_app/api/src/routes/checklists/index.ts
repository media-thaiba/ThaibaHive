import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const checklistsRouter = Router();
checklistsRouter.use(authenticate);

checklistsRouter.get("/templates", async (req: AuthRequest, res) => {
  try {
    const { type, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.checklistTemplates.isActive, true)];
    if (type) conditions.push(eq(tables.checklistTemplates.type, type as string));
    const items = await db.select().from(tables.checklistTemplates).where(and(...conditions)).orderBy(desc(tables.checklistTemplates.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalTemplatesResult = await db.select({ count: count() }).from(tables.checklistTemplates).where(and(...conditions)).get();
    const total = totalTemplatesResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.post("/templates", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { name, type, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const id = uuid();
    await db.insert(tables.checklistTemplates).values({ id, name, type: type || "onboarding", description }).run();
    const item = await db.select().from(tables.checklistTemplates).where(eq(tables.checklistTemplates.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.get("/templates/:id/items", async (req: AuthRequest, res) => {
  try {
    const items = await db.select().from(tables.checklistTemplateItems).where(eq(tables.checklistTemplateItems.templateId, req.params.id)).orderBy(tables.checklistTemplateItems.order).all();
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.post("/templates/:id/items", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, order } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });
    const id = uuid();
    await db.insert(tables.checklistTemplateItems).values({ id, templateId: req.params.id, title, description, order: order || 0 }).run();
    const item = await db.select().from(tables.checklistTemplateItems).where(eq(tables.checklistTemplateItems.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.get("/assignments", async (req: AuthRequest, res) => {
  try {
    const { staffId, status, type, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (staffId) conditions.push(eq(tables.staffChecklists.staffId, staffId as string));
    if (status) conditions.push(eq(tables.staffChecklists.status, status as string));
    if (type) conditions.push(eq(tables.staffChecklists.type, type as string));
    const items = await db.select().from(tables.staffChecklists).where(and(...conditions)).orderBy(desc(tables.staffChecklists.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalAssignmentsResult = await db.select({ count: count() }).from(tables.staffChecklists).where(and(...conditions)).get();
    const total = totalAssignmentsResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.post("/assignments", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { staffId, templateId, type, notes } = req.body;
    if (!staffId) return res.status(400).json({ error: "staffId required" });
    const id = uuid();
    await db.insert(tables.staffChecklists).values({ id, staffId, templateId, type: type || "onboarding", notes, createdById: req.user!.id }).run();
    if (templateId) {
      const items = await db.select().from(tables.checklistTemplateItems).where(eq(tables.checklistTemplateItems.templateId, templateId)).orderBy(tables.checklistTemplateItems.order).all();
      for (const item of items) {
        await db.insert(tables.staffChecklistTasks).values({ id: uuid(), checklistId: id, title: item.title, description: item.description, order: item.order }).run();
      }
    }
    const item = await db.select().from(tables.staffChecklists).where(eq(tables.staffChecklists.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

checklistsRouter.put("/assignments/:id", async (req: AuthRequest, res) => {
  try {
    const { status, tasks } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) { updates.status = status; if (status === "in_progress") updates.startedAt = new Date().toISOString(); if (status === "completed") updates.completedAt = new Date().toISOString(); }
    await db.update(tables.staffChecklists).set(updates).where(eq(tables.staffChecklists.id, req.params.id)).run();
    if (tasks?.length) {
      for (const t of tasks) {
        const taskUpdates: any = {};
        if (t.isCompleted !== undefined) { taskUpdates.isCompleted = t.isCompleted; taskUpdates.completedById = req.user!.id; taskUpdates.completedAt = t.isCompleted ? new Date().toISOString() : null; }
        await db.update(tables.staffChecklistTasks).set(taskUpdates).where(eq(tables.staffChecklistTasks.id, t.id)).run();
      }
    }
    res.json({ message: "Checklist updated" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
