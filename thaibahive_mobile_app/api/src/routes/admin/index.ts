import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole("admin", "super_admin"));

function crud(table: any, idField: string, allowedFields: string[]) {
  const router = Router({ mergeParams: true });

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const conditions: any[] = [];
      if (req.query.isActive !== undefined) conditions.push(eq(table.isActive, req.query.isActive === "true"));
      const items = await db.select().from(table).where(and(...conditions)).orderBy(desc(table.createdAt)).limit(limit).offset((page - 1) * limit).all();
      const totalResult = await db.select({ count: count() }).from(table).where(and(...conditions)).get();
      const total = totalResult?.count ?? 0;
      res.json({ data: items, total, page, limit });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const id = uuid();
      const values: any = { id };
      for (const f of allowedFields) { if (req.body[f] !== undefined) values[f] = req.body[f]; }
      await db.insert(table).values(values).run();
      const item = await db.select().from(table).where(eq(table.id, id)).get();
      res.status(201).json(item);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.put("/:id", async (req: AuthRequest, res) => {
    try {
      const updates: any = { updatedAt: new Date().toISOString() };
      for (const f of allowedFields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
      await db.update(table).set(updates).where(eq(table.id, req.params.id)).run();
      const item = await db.select().from(table).where(eq(table.id, req.params.id)).get();
      res.json(item);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      await db.delete(table).where(eq(table.id, req.params.id)).run();
      res.json({ message: "Deleted" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return router;
}

const instFields = ["name", "code", "type", "address", "phone", "email", "isActive"];
const deptFields = ["institutionId", "name", "code", "description", "headUserId", "isActive"];
const subDeptFields = ["departmentId", "name", "code", "description", "isActive"];
const shiftFields = ["name", "startTime", "endTime", "gracePeriodMinutes", "departmentId", "applicableToAll", "isActive"];

adminRouter.use("/institutions", crud(tables.institutions, "id", instFields));
adminRouter.use("/departments", crud(tables.departments, "id", deptFields));
adminRouter.use("/sub-departments", crud(tables.subDepartments, "id", subDeptFields));
adminRouter.use("/shifts", crud(tables.shifts, "id", shiftFields));
