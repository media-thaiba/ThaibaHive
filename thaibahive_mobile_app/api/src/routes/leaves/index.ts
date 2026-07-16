import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, gte, lte, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const leavesRouter = Router();
leavesRouter.use(authenticate);

leavesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, leaveTypeId, staffId, startDate, endDate, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.leaveRequests.status, status as string));
    if (leaveTypeId) conditions.push(eq(tables.leaveRequests.leaveTypeId, leaveTypeId as string));
    if (req.user!.role === "staff") {
      conditions.push(eq(tables.leaveRequests.staffId, req.user!.id));
    } else if (staffId) {
      conditions.push(eq(tables.leaveRequests.staffId, staffId as string));
    }
    if (startDate) conditions.push(gte(tables.leaveRequests.startDate, startDate as string));
    if (endDate) conditions.push(lte(tables.leaveRequests.endDate, endDate as string));
    const leaves = await db.select().from(tables.leaveRequests).where(and(...conditions)).orderBy(desc(tables.leaveRequests.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.leaveRequests).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: leaves, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

leavesRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { leaveTypeId, startDate, endDate, daysCount, reason } = req.body;
    if (!leaveTypeId || !startDate || !endDate || !daysCount) return res.status(400).json({ error: "Missing required fields" });
    const id = uuid();
    await db.insert(tables.leaveRequests).values({ id, staffId: req.user!.id, leaveTypeId, startDate, endDate, daysCount, reason }).run();
    const leave = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.id, id)).get();
    res.status(201).json(leave);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

leavesRouter.get("/types", async (_req, res) => {
  try {
    const types = await db.select().from(tables.leaveTypes).where(eq(tables.leaveTypes.isActive, true)).all();
    res.json(types);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

leavesRouter.get("/balance", async (req: AuthRequest, res) => {
  try {
    const year = new Date().getFullYear();
    const balances = await db.select().from(tables.leaveBalances).where(and(eq(tables.leaveBalances.staffId, req.user!.id), eq(tables.leaveBalances.year, year))).all();
    res.json(balances);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

leavesRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const leave = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.id, req.params.id)).get();
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    if (req.user!.role === "staff" && leave.staffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    res.json(leave);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

leavesRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const existing = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Leave request not found" });
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) {
      updates.status = status;
      updates.reviewedById = req.user!.id;
      updates.reviewedAt = new Date().toISOString();
    }
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    await db.update(tables.leaveRequests).set(updates).where(eq(tables.leaveRequests.id, req.params.id)).run();
    const updated = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.id, req.params.id)).get();
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
