import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, date, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.dailyReports.status, status as string));
    if (date) conditions.push(eq(tables.dailyReports.date, date as string));
    if (req.user!.role === "staff") conditions.push(eq(tables.dailyReports.staffId, req.user!.id));
    const items = await db.select().from(tables.dailyReports).where(and(...conditions)).orderBy(desc(tables.dailyReports.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.dailyReports).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

reportsRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { date, summary, tasks } = req.body;
    if (!date) return res.status(400).json({ error: "Date required" });
    const id = uuid();
    await db.insert(tables.dailyReports).values({ id, staffId: req.user!.id, date, summary, status: "draft" }).run();
    if (tasks?.length) {
      for (const t of tasks) {
        await db.insert(tables.dailyReportTasks).values({ id: uuid(), reportId: id, taskId: t.taskId, description: t.description, hoursSpent: t.hoursSpent, status: t.status || "completed" }).run();
      }
    }
    const item = await db.select().from(tables.dailyReports).where(eq(tables.dailyReports.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

reportsRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const report = await db.select().from(tables.dailyReports).where(eq(tables.dailyReports.id, req.params.id)).get();
    if (!report) return res.status(404).json({ error: "Report not found" });
    const tasks = await db.select().from(tables.dailyReportTasks).where(eq(tables.dailyReportTasks.reportId, report.id)).all();
    res.json({ ...report, tasks });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

reportsRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const existingCheck = await db.select().from(tables.dailyReports).where(eq(tables.dailyReports.id, req.params.id)).get();
    if (!existingCheck) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existingCheck.staffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { summary, status, tasks } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (summary !== undefined) updates.summary = summary;
    if (status) { updates.status = status; if (status === "submitted") updates.reviewedById = req.user!.id; }
    await db.update(tables.dailyReports).set(updates).where(eq(tables.dailyReports.id, req.params.id)).run();
    if (tasks?.length) {
      await db.delete(tables.dailyReportTasks).where(eq(tables.dailyReportTasks.reportId, req.params.id)).run();
      for (const t of tasks) {
        await db.insert(tables.dailyReportTasks).values({ id: uuid(), reportId: req.params.id, taskId: t.taskId, description: t.description, hoursSpent: t.hoursSpent, status: t.status || "completed" }).run();
      }
    }
    const item = await db.select().from(tables.dailyReports).where(eq(tables.dailyReports.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

reportsRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existingCheck = await db.select().from(tables.dailyReports).where(eq(tables.dailyReports.id, req.params.id)).get();
    if (!existingCheck) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existingCheck.staffId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    await db.delete(tables.dailyReportTasks).where(eq(tables.dailyReportTasks.reportId, req.params.id)).run();
    await db.delete(tables.dailyReports).where(eq(tables.dailyReports.id, req.params.id)).run();
    res.json({ message: "Report deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
