import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const assetsRouter = Router();
assetsRouter.use(authenticate);

assetsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { type, status, assignedToId, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.assets.isActive, true)];
    if (type) conditions.push(eq(tables.assets.type, type as string));
    if (status) conditions.push(eq(tables.assets.status, status as string));
    if (assignedToId) conditions.push(eq(tables.assets.assignedToId, assignedToId as string));
    const items = await db.select().from(tables.assets).where(and(...conditions)).orderBy(desc(tables.assets.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.assets).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

assetsRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { name, type, model, serialNumber, institutionId, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status, notes } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Name and type required" });
    const id = uuid();
    await db.insert(tables.assets).values({ id, name, type, model, serialNumber, institutionId, assignedToId, location, purchaseDate, purchaseCost, warrantyEnd, status: status || "available", notes }).run();
    const item = await db.select().from(tables.assets).where(eq(tables.assets.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

assetsRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const allowedFields = ["name", "type", "model", "serialNumber", "assignedToId", "location", "status", "notes", "purchaseCost", "warrantyEnd", "isActive"];
    const updates: any = { updatedAt: new Date().toISOString() };
    for (const f of allowedFields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
    await db.update(tables.assets).set(updates).where(eq(tables.assets.id, req.params.id)).run();
    const item = await db.select().from(tables.assets).where(eq(tables.assets.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

assetsRouter.get("/:id/service-history", async (req: AuthRequest, res) => {
  try {
    const items = await db.select().from(tables.assetServiceHistory).where(eq(tables.assetServiceHistory.assetId, req.params.id)).orderBy(desc(tables.assetServiceHistory.createdAt)).all();
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

assetsRouter.post("/:id/service-history", async (req: AuthRequest, res) => {
  try {
    const { serviceDate, description, cost, servicedBy, notes } = req.body;
    if (!serviceDate || !description) return res.status(400).json({ error: "serviceDate and description required" });
    const id = uuid();
    await db.insert(tables.assetServiceHistory).values({ id, assetId: req.params.id, serviceDate, description, cost, servicedBy, notes }).run();
    const item = await db.select().from(tables.assetServiceHistory).where(eq(tables.assetServiceHistory.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
