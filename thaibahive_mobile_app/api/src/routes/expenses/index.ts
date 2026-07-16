import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const expensesRouter = Router();
expensesRouter.use(authenticate);

expensesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, category, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.expenseClaims.status, status as string));
    if (category) conditions.push(eq(tables.expenseClaims.category, category as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.expenseClaims.staffId, req.user!.id));
    const items = await db.select().from(tables.expenseClaims).where(and(...conditions)).orderBy(desc(tables.expenseClaims.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.expenseClaims).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

expensesRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { amount, category, description, receiptUrl } = req.body;
    if (!amount || !category || !description) return res.status(400).json({ error: "amount, category, description required" });
    const id = uuid();
    await db.insert(tables.expenseClaims).values({ id, staffId: req.user!.id, amount, category, description, receiptUrl }).run();
    const item = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

expensesRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.staffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { status, reviewNotes } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) { updates.status = status; updates.reviewedById = req.user!.id; updates.reviewedAt = new Date().toISOString(); }
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    await db.update(tables.expenseClaims).set(updates).where(eq(tables.expenseClaims.id, req.params.id)).run();
    const item = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

expensesRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.staffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    await db.delete(tables.expenseClaims).where(eq(tables.expenseClaims.id, req.params.id)).run();
    res.json({ message: "Expense claim deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
