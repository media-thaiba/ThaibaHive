import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const helpDeskRouter = Router();
helpDeskRouter.use(authenticate);

helpDeskRouter.get("/tickets", async (req: AuthRequest, res) => {
  try {
    const { status, category, priority, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.helpDeskTickets.status, status as string));
    if (category) conditions.push(eq(tables.helpDeskTickets.category, category as string));
    if (priority) conditions.push(eq(tables.helpDeskTickets.priority, priority as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.helpDeskTickets.submittedById, req.user!.id));
    const items = await db.select().from(tables.helpDeskTickets).where(and(...conditions)).orderBy(desc(tables.helpDeskTickets.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.helpDeskTickets).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

helpDeskRouter.post("/tickets", async (req: AuthRequest, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description) return res.status(400).json({ error: "Title and description required" });
    const id = uuid();
    await db.insert(tables.helpDeskTickets).values({ id, title, description, category: category || "it", priority: priority || "medium", submittedById: req.user!.id }).run();
    const item = await db.select().from(tables.helpDeskTickets).where(eq(tables.helpDeskTickets.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

helpDeskRouter.get("/tickets/:id", async (req: AuthRequest, res) => {
  try {
    const ticket = await db.select().from(tables.helpDeskTickets).where(eq(tables.helpDeskTickets.id, req.params.id)).get();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (req.user!.role === "staff" && ticket.submittedById !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const comments = await db.select().from(tables.helpDeskComments).where(eq(tables.helpDeskComments.ticketId, ticket.id)).orderBy(desc(tables.helpDeskComments.createdAt)).all();
    res.json({ ...ticket, comments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

helpDeskRouter.put("/tickets/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.helpDeskTickets).where(eq(tables.helpDeskTickets.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.submittedById !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { status, assignedToId, priority } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) { updates.status = status; if (status === "resolved") updates.resolvedAt = new Date().toISOString(); }
    if (assignedToId !== undefined) updates.assignedToId = assignedToId;
    if (priority !== undefined) updates.priority = priority;
    await db.update(tables.helpDeskTickets).set(updates).where(eq(tables.helpDeskTickets.id, req.params.id)).run();
    const item = await db.select().from(tables.helpDeskTickets).where(eq(tables.helpDeskTickets.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

helpDeskRouter.post("/tickets/:id/comments", async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    const id = uuid();
    await db.insert(tables.helpDeskComments).values({ id, ticketId: req.params.id, staffId: req.user!.id, content }).run();
    const comment = await db.select().from(tables.helpDeskComments).where(eq(tables.helpDeskComments.id, id)).get();
    res.status(201).json(comment);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

helpDeskRouter.get("/tickets/:id/comments", async (req: AuthRequest, res) => {
  try {
    const comments = await db.select().from(tables.helpDeskComments).where(eq(tables.helpDeskComments.ticketId, req.params.id)).orderBy(desc(tables.helpDeskComments.createdAt)).all();
    res.json(comments);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
