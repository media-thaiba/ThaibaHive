import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, gte, lte, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const eventsRouter = Router();
eventsRouter.use(authenticate);

eventsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { eventType, departmentId, startDate, endDate, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.events.isActive, true)];
    if (eventType) conditions.push(eq(tables.events.eventType, eventType as string));
    if (departmentId) conditions.push(eq(tables.events.departmentId, departmentId as string));
    if (startDate) conditions.push(gte(tables.events.startDate, startDate as string));
    if (endDate) conditions.push(lte(tables.events.endDate, endDate as string));
    const items = await db.select().from(tables.events).where(and(...conditions)).orderBy(desc(tables.events.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.events).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

eventsRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, eventType, startDate, endDate, location, departmentId, institutionId, maxAttendees } = req.body;
    if (!title || !startDate) return res.status(400).json({ error: "Title and startDate required" });
    const id = uuid();
    await db.insert(tables.events).values({ id, title, description, eventType: eventType || "institution", startDate, endDate, location, departmentId, institutionId, createdById: req.user!.id, maxAttendees }).run();
    const item = await db.select().from(tables.events).where(eq(tables.events.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

eventsRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, eventType, startDate, endDate, location, maxAttendees, isActive } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (eventType !== undefined) updates.eventType = eventType;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (location !== undefined) updates.location = location;
    if (maxAttendees !== undefined) updates.maxAttendees = maxAttendees;
    if (isActive !== undefined) updates.isActive = isActive;
    await db.update(tables.events).set(updates).where(eq(tables.events.id, req.params.id)).run();
    const item = await db.select().from(tables.events).where(eq(tables.events.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

eventsRouter.delete("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.events).where(eq(tables.events.id, req.params.id)).run();
    res.json({ message: "Event deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

eventsRouter.post("/:id/rsvp", async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const existing = await db.select().from(tables.eventRsvps).where(and(eq(tables.eventRsvps.eventId, req.params.id), eq(tables.eventRsvps.staffId, req.user!.id))).get();
    if (existing) {
      await db.update(tables.eventRsvps).set({ status: status || "pending", respondedAt: new Date().toISOString() }).where(eq(tables.eventRsvps.id, existing.id)).run();
      const updated = await db.select().from(tables.eventRsvps).where(eq(tables.eventRsvps.id, existing.id)).get();
      return res.json(updated);
    }
    const id = uuid();
    await db.insert(tables.eventRsvps).values({ id, eventId: req.params.id, staffId: req.user!.id, status: status || "pending" }).run();
    const rsvp = await db.select().from(tables.eventRsvps).where(eq(tables.eventRsvps.id, id)).get();
    res.status(201).json(rsvp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


