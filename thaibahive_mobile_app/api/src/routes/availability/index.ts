import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const availabilityRouter = Router();
availabilityRouter.use(authenticate);

availabilityRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.staffAvailability.status, status as string));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const items = await db.select().from(tables.staffAvailability).where(where).all();
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

availabilityRouter.put("/", async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status required" });
    const existing = await db.select().from(tables.staffAvailability).where(eq(tables.staffAvailability.staffId, req.user!.id)).get();
    if (existing) {
      await db.update(tables.staffAvailability).set({ status, updatedAt: new Date().toISOString() }).where(eq(tables.staffAvailability.staffId, req.user!.id)).run();
    } else {
      await db.insert(tables.staffAvailability).values({ id: uuid(), staffId: req.user!.id, status }).run();
    }
    const item = await db.select().from(tables.staffAvailability).where(eq(tables.staffAvailability.staffId, req.user!.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

availabilityRouter.get("/:staffId", async (req: AuthRequest, res) => {
  try {
    const item = await db.select().from(tables.staffAvailability).where(eq(tables.staffAvailability.staffId, req.params.staffId)).get();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
