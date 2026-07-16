import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const visitorsRouter = Router();
visitorsRouter.use(authenticate);

visitorsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, hostStaffId, page = "1", limit = "20" } = req.query;
    const p = parseInt(page as string), l = parseInt(limit as string);
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.visitors.status, status as string));
    if (hostStaffId) conditions.push(eq(tables.visitors.hostStaffId, hostStaffId as string));
    const items = await db.select().from(tables.visitors).where(and(...conditions)).orderBy(desc(tables.visitors.createdAt)).limit(l).offset((p - 1) * l).all();
    const total = (await db.select().from(tables.visitors).where(and(...conditions)).all()).length;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

visitorsRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, contact, idType, idNumber, hostStaffId, purpose, checkIn, notes } = req.body;
    if (!name || !purpose || !checkIn) return res.status(400).json({ error: "Name, purpose, and checkIn required" });
    const id = uuid();
    await db.insert(tables.visitors).values({ id, name, contact, idType, idNumber, hostStaffId, purpose, checkIn, notes }).run();
    const item = await db.select().from(tables.visitors).where(eq(tables.visitors.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

visitorsRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.visitors).where(eq(tables.visitors.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.hostStaffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { checkOut, status, notes } = req.body;
    const updates: any = {};
    if (checkOut !== undefined) updates.checkOut = checkOut;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    await db.update(tables.visitors).set(updates).where(eq(tables.visitors.id, req.params.id)).run();
    const item = await db.select().from(tables.visitors).where(eq(tables.visitors.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

visitorsRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.visitors).where(eq(tables.visitors.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.hostStaffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    await db.delete(tables.visitors).where(eq(tables.visitors.id, req.params.id)).run();
    res.json({ message: "Visitor record deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
