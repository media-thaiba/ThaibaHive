import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const canteenRouter = Router();
canteenRouter.use(authenticate);

canteenRouter.get("/meals", async (req: AuthRequest, res) => {
  try {
    const { date, mealType, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (date) conditions.push(eq(tables.mealNotifications.date, date as string));
    if (mealType) conditions.push(eq(tables.mealNotifications.mealType, mealType as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.mealNotifications.staffId, req.user!.id));
    const items = await db.select().from(tables.mealNotifications).where(and(...conditions)).orderBy(desc(tables.mealNotifications.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.mealNotifications).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

canteenRouter.post("/meals", async (req: AuthRequest, res) => {
  try {
    const { date, mealType, status, guestCount, notes } = req.body;
    if (!date || !mealType) return res.status(400).json({ error: "Date and mealType required" });
    const existing = await db.select().from(tables.mealNotifications).where(and(eq(tables.mealNotifications.staffId, req.user!.id), eq(tables.mealNotifications.date, date), eq(tables.mealNotifications.mealType, mealType))).get();
    if (existing) {
      await db.update(tables.mealNotifications).set({ status: status || "skip", guestCount: guestCount || 0, notes }).where(eq(tables.mealNotifications.id, existing.id)).run();
      const updated = await db.select().from(tables.mealNotifications).where(eq(tables.mealNotifications.id, existing.id)).get();
      return res.json(updated);
    }
    const id = uuid();
    await db.insert(tables.mealNotifications).values({ id, staffId: req.user!.id, date, mealType, status: status || "skip", guestCount: guestCount || 0, notes }).run();
    const item = await db.select().from(tables.mealNotifications).where(eq(tables.mealNotifications.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

canteenRouter.put("/meals/:id", async (req: AuthRequest, res) => {
  try {
    const { status, guestCount, notes } = req.body;
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (guestCount !== undefined) updates.guestCount = guestCount;
    if (notes !== undefined) updates.notes = notes;
    await db.update(tables.mealNotifications).set(updates).where(eq(tables.mealNotifications.id, req.params.id)).run();
    const item = await db.select().from(tables.mealNotifications).where(eq(tables.mealNotifications.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
