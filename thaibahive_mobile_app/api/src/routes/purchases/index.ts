import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const purchasesRouter = Router();
purchasesRouter.use(authenticate);

purchasesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.purchaseRequests.status, status as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.purchaseRequests.requesterId, req.user!.id));
    const items = await db.select().from(tables.purchaseRequests).where(and(...conditions)).orderBy(desc(tables.purchaseRequests.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.purchaseRequests).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

purchasesRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { itemName, quantity, estimatedCost, justification, notes } = req.body;
    if (!itemName) return res.status(400).json({ error: "itemName required" });
    const id = uuid();
    await db.insert(tables.purchaseRequests).values({ id, requesterId: req.user!.id, itemName, quantity: quantity || 1, estimatedCost, justification, notes }).run();
    const item = await db.select().from(tables.purchaseRequests).where(eq(tables.purchaseRequests.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const APPROVAL_STAGES: Record<string, string> = {
  pending_hod: "approved_by_hod_id",
  pending_accounts: "approved_by_accounts_id",
  pending_purchase: "approved_by_purchase_id",
};

purchasesRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body;
    const existing = await db.select().from(tables.purchaseRequests).where(eq(tables.purchaseRequests.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Purchase request not found" });
    const updates: any = { updatedAt: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    if (status) {
      const stageField = APPROVAL_STAGES[existing.status];
      if (stageField) updates[stageField] = req.user!.id;
      if (status === "approved") updates.approvedAt = new Date().toISOString();
      updates.status = status;
    }
    await db.update(tables.purchaseRequests).set(updates).where(eq(tables.purchaseRequests.id, req.params.id)).run();
    const item = await db.select().from(tables.purchaseRequests).where(eq(tables.purchaseRequests.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
