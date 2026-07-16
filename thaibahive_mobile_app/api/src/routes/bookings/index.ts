import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const bookingsRouter = Router();
bookingsRouter.use(authenticate);

bookingsRouter.get("/resources", async (req: AuthRequest, res) => {
  try {
    const { type, page = "1", limit = "50" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.bookingResources.isActive, true)];
    if (type) conditions.push(eq(tables.bookingResources.type, type as string));
    const items = await db.select().from(tables.bookingResources).where(and(...conditions)).orderBy(desc(tables.bookingResources.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.bookingResources).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

bookingsRouter.post("/resources", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { name, type, description, capacity, location, institutionId } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Name and type required" });
    const id = uuid();
    await db.insert(tables.bookingResources).values({ id, name, type, description, capacity, location, institutionId }).run();
    const item = await db.select().from(tables.bookingResources).where(eq(tables.bookingResources.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

bookingsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { resourceId, status, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (resourceId) conditions.push(eq(tables.bookings.resourceId, resourceId as string));
    if (status) conditions.push(eq(tables.bookings.status, status as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.bookings.bookerId, req.user!.id));
    const items = await db.select().from(tables.bookings).where(and(...conditions)).orderBy(desc(tables.bookings.createdAt)).limit(l).offset((p - 1) * l).all();
    const total2Result = await db.select({ count: count() }).from(tables.bookings).where(and(...conditions)).get();
    const total = total2Result?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

bookingsRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { resourceId, title, startTime, endTime, notes } = req.body;
    if (!resourceId || !title || !startTime || !endTime) return res.status(400).json({ error: "Missing required fields" });
    const id = uuid();
    await db.insert(tables.bookings).values({ id, resourceId, bookerId: req.user!.id, title, startTime, endTime, notes }).run();
    const item = await db.select().from(tables.bookings).where(eq(tables.bookings.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

bookingsRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.bookerId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { status, notes } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) { updates.status = status; updates.approvedById = req.user!.id; }
    if (notes !== undefined) updates.notes = notes;
    await db.update(tables.bookings).set(updates).where(eq(tables.bookings.id, req.params.id)).run();
    const item = await db.select().from(tables.bookings).where(eq(tables.bookings.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

bookingsRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.bookerId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    await db.update(tables.bookings).set({ status: "cancelled", updatedAt: new Date().toISOString() }).where(eq(tables.bookings.id, req.params.id)).run();
    res.json({ message: "Booking cancelled" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
