import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const recognitionRouter = Router();
recognitionRouter.use(authenticate);

recognitionRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { recognitionType, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (recognitionType) conditions.push(eq(tables.staffRecognition.recognitionType, recognitionType as string));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const items = await db.select().from(tables.staffRecognition).where(where).orderBy(desc(tables.staffRecognition.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.staffRecognition).where(where).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

recognitionRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { staffId, recognitionType, message, date } = req.body;
    if (!staffId || !recognitionType || !date) return res.status(400).json({ error: "staffId, recognitionType, and date required" });
    const id = uuid();
    await db.insert(tables.staffRecognition).values({ id, staffId, recognitionType, message, recognizedById: req.user!.id, date }).run();
    const item = await db.select().from(tables.staffRecognition).where(eq(tables.staffRecognition.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

recognitionRouter.delete("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.staffRecognition).where(eq(tables.staffRecognition.id, req.params.id)).run();
    res.json({ message: "Recognition deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
