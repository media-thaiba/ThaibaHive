import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, or, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const grievancesRouter = Router();
grievancesRouter.use(authenticate);

grievancesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, category, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.grievances.status, status as string));
    if (category) conditions.push(eq(tables.grievances.category, category as string));
    if (req.user!.role === "staff") {
      conditions.push(
        or(
          eq(tables.grievances.staffId, req.user!.id),
          eq(tables.grievances.isAnonymous, true)
        )
      );
    }
    const items = await db.select().from(tables.grievances).where(and(...conditions)).orderBy(desc(tables.grievances.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.grievances).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

grievancesRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { isAnonymous, category, subject, description } = req.body;
    if (!subject || !description) return res.status(400).json({ error: "Subject and description required" });
    const id = uuid();
    await db.insert(tables.grievances).values({ id, staffId: isAnonymous ? null : req.user!.id, isAnonymous: isAnonymous !== false, category: category || "general", subject, description }).run();
    const item = await db.select().from(tables.grievances).where(eq(tables.grievances.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

grievancesRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { response, status } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (response) { updates.response = response; updates.respondedById = req.user!.id; updates.respondedAt = new Date().toISOString(); }
    if (status) updates.status = status;
    await db.update(tables.grievances).set(updates).where(eq(tables.grievances.id, req.params.id)).run();
    const item = await db.select().from(tables.grievances).where(eq(tables.grievances.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
