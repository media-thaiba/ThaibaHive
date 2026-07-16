import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const circularsRouter = Router();
circularsRouter.use(authenticate);

circularsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { category, targetRole, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.circulars.isActive, true)];
    if (category) conditions.push(eq(tables.circulars.category, category as string));
    if (targetRole) conditions.push(eq(tables.circulars.targetRole, targetRole as string));
    const items = await db.select().from(tables.circulars).where(and(...conditions)).orderBy(desc(tables.circulars.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.circulars).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

circularsRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, fileUrl, fileType, fileSize, category, targetRole, targetDepartmentId, targetInstitutionId } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ error: "Title and fileUrl required" });
    const id = uuid();
    await db.insert(tables.circulars).values({ id, title, description, fileUrl, fileType, fileSize, category: category || "general", targetRole, targetDepartmentId, targetInstitutionId, uploadedById: req.user!.id }).run();
    const item = await db.select().from(tables.circulars).where(eq(tables.circulars.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

circularsRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, fileUrl, category, isActive } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (fileUrl !== undefined) updates.fileUrl = fileUrl;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.isActive = isActive;
    await db.update(tables.circulars).set(updates).where(eq(tables.circulars.id, req.params.id)).run();
    const item = await db.select().from(tables.circulars).where(eq(tables.circulars.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

circularsRouter.delete("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.circulars).where(eq(tables.circulars.id, req.params.id)).run();
    res.json({ message: "Circular deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
