import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, gte, lte, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const accountsRouter = Router();
accountsRouter.use(authenticate);
accountsRouter.use(requireRole("admin", "super_admin"));

accountsRouter.get("/transactions", async (req: AuthRequest, res) => {
  try {
    const { type, category, institutionId, startDate, endDate, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (type) conditions.push(eq(tables.financialTransactions.type, type as string));
    if (category) conditions.push(eq(tables.financialTransactions.category, category as string));
    if (institutionId) conditions.push(eq(tables.financialTransactions.institutionId, institutionId as string));
    if (startDate) conditions.push(gte(tables.financialTransactions.transactionDate, startDate as string));
    if (endDate) conditions.push(lte(tables.financialTransactions.transactionDate, endDate as string));
    const items = await db.select().from(tables.financialTransactions).where(and(...conditions)).orderBy(desc(tables.financialTransactions.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.financialTransactions).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

accountsRouter.post("/transactions", async (req: AuthRequest, res) => {
  try {
    const { institutionId, type, category, amount, description, transactionDate, notes } = req.body;
    if (!institutionId || !type || !category || !amount || !transactionDate) return res.status(400).json({ error: "Missing required fields" });
    const id = uuid();
    await db.insert(tables.financialTransactions).values({ id, institutionId, type, category, amount, description, transactionDate, recordedById: req.user!.id, notes }).run();
    const item = await db.select().from(tables.financialTransactions).where(eq(tables.financialTransactions.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

accountsRouter.delete("/transactions/:id", async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.financialTransactions).where(eq(tables.financialTransactions.id, req.params.id)).run();
    res.json({ message: "Transaction deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


