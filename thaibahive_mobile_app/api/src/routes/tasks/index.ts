import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const tasksRouter = Router();
tasksRouter.use(authenticate);

tasksRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, priority, assigneeId, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (status) conditions.push(eq(tables.tasks.status, status as string));
    if (priority) conditions.push(eq(tables.tasks.priority, priority as string));
    if (req.user!.role === "staff") {
      conditions.push(eq(tables.tasks.assignedToId, req.user!.id));
    } else if (assigneeId) {
      conditions.push(eq(tables.tasks.assignedToId, assigneeId as string));
    }
    const tasks = await db.select().from(tables.tasks).where(and(...conditions)).orderBy(desc(tables.tasks.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.tasks).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: tasks, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { title, description, status, priority, assignedToId, departmentId, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const id = uuid();
    await db.insert(tables.tasks).values({ id, title, description, status: status || "todo", priority: priority || "medium", assignedToId, assignedById: req.user!.id, departmentId, dueDate }).run();
    const task = await db.select().from(tables.tasks).where(eq(tables.tasks.id, id)).get();
    res.status(201).json(task);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const task = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id)).get();
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user!.role === "staff" && task.assignedToId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const comments = await db.select().from(tables.taskComments).where(eq(tables.taskComments.taskId, task.id)).orderBy(desc(tables.taskComments.createdAt)).all();
    res.json({ ...task, comments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const existingTask = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id)).get();
    if (!existingTask) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existingTask.assignedToId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { title, description, status, priority, assignedToId, dueDate, departmentId } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    if (status === "completed") updates.completedAt = new Date().toISOString();
    await db.update(tables.tasks).set(updates).where(eq(tables.tasks.id, req.params.id)).run();
    const task = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id)).get();
    res.json(task);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existingTask = await db.select().from(tables.tasks).where(eq(tables.tasks.id, req.params.id)).get();
    if (!existingTask) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existingTask.assignedToId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    await db.delete(tables.tasks).where(eq(tables.tasks.id, req.params.id)).run();
    res.json({ message: "Task deleted" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.post("/:id/comments", async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });
    const id = uuid();
    await db.insert(tables.taskComments).values({ id, taskId: req.params.id, staffId: req.user!.id, content }).run();
    const comment = await db.select().from(tables.taskComments).where(eq(tables.taskComments.id, id)).get();
    res.status(201).json(comment);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

tasksRouter.get("/:id/comments", async (req: AuthRequest, res) => {
  try {
    const comments = await db.select().from(tables.taskComments).where(eq(tables.taskComments.taskId, req.params.id)).orderBy(desc(tables.taskComments.createdAt)).all();
    res.json(comments);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
