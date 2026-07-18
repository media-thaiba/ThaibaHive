import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const pollsRouter = Router();
pollsRouter.use(authenticate);

pollsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const items = await db.select().from(tables.polls).where(eq(tables.polls.isActive, true)).orderBy(desc(tables.polls.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.polls).where(eq(tables.polls.isActive, true)).get();
    const total = totalResult?.count ?? 0;
    const myResponses = await db.select().from(tables.pollResponses).where(eq(tables.pollResponses.staffId, req.user!.id)).all();
    const data = items.map(p => ({ ...p, myResponse: myResponses.find(r => r.pollId === p.id) || null }));
    res.json({ data, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

pollsRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { title, description, question, options, targetRole, targetDepartmentId, targetInstitutionId, expiresAt } = req.body;
    if (!title || !question || !options?.length) return res.status(400).json({ error: "Title, question, and options required" });
    const id = uuid();
    await db.insert(tables.polls).values({ id, title, description, question, options, targetRole, targetDepartmentId, targetInstitutionId, createdById: req.user!.id, expiresAt }).run();
    const item = await db.select().from(tables.polls).where(eq(tables.polls.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

pollsRouter.post("/:id/respond", async (req: AuthRequest, res) => {
  try {
    const { selectedOption } = req.body;
    const existing = await db.select().from(tables.pollResponses).where(and(eq(tables.pollResponses.pollId, req.params.id), eq(tables.pollResponses.staffId, req.user!.id))).get();
    if (existing) return res.status(400).json({ error: "Already responded" });
    const id = uuid();
    await db.insert(tables.pollResponses).values({ id, pollId: req.params.id, staffId: req.user!.id, selectedOption }).run();
    res.status(201).json({ message: "Response recorded" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

pollsRouter.get("/:id/results", async (req: AuthRequest, res) => {
  try {
    const poll = await db.select().from(tables.polls).where(eq(tables.polls.id, req.params.id)).get();
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    const responses = await db.select().from(tables.pollResponses).where(eq(tables.pollResponses.pollId, req.params.id)).all();
    const optionsArray = (poll.options as string[]) || [];
    const results = optionsArray.map((opt: string, idx: number) => ({ option: opt, count: responses.filter(r => r.selectedOption === idx).length }));

    res.json({ poll, results, totalResponses: responses.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

pollsRouter.delete("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    await db.delete(tables.polls).where(eq(tables.polls.id, req.params.id)).run();
    res.json({ message: "Poll deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
