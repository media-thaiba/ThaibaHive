import { Router } from "express";
import { db, tables } from "../../db";
import { eq, like, and, or, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const staffRouter = Router();
staffRouter.use(authenticate);

staffRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { departmentId, institutionId, role, isActive, search, page = "1", limit = "50" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (role) conditions.push(eq(tables.staff.role, role as string));
    if (isActive !== undefined) conditions.push(eq(tables.staff.isActive, isActive === "true"));
    if (search) {
      const s = `%${search}%`;
      conditions.push(or(like(tables.staff.firstName, s), like(tables.staff.lastName, s), like(tables.staff.email, s), like(tables.staff.employeeId, s)));
    }
    const staff = await db.select().from(tables.staff).where(and(...conditions)).orderBy(desc(tables.staff.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.staff).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    const safe = staff.map(({ passwordHash, ...s }) => s);
    res.json({ data: safe, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

staffRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.params.id)).get();
    if (!user) return res.status(404).json({ error: "Staff not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

staffRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "phone", "designation", "role", "dateOfBirth", "dateOfJoining", "qualifications", "skills", "emergencyContactName", "emergencyContactPhone", "bankAccount", "ifscCode", "contractEndDate", "aadhaar", "pan", "biography", "avatarUrl", "teachingSubjects"];
    const updates: any = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await db.update(tables.staff).set(updates).where(eq(tables.staff.id, req.params.id)).run();
    const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.params.id)).get();
    const { passwordHash, ...safeUser } = user!;
    res.json(safeUser);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

staffRouter.get("/:id/departments", async (req: AuthRequest, res) => {
  try {
    const staffDepts = await db.select().from(tables.staffDepartments).where(eq(tables.staffDepartments.staffId, req.params.id)).all();
    res.json(staffDepts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

staffRouter.put("/:id/status", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { isActive } = req.body;
    await db.update(tables.staff).set({ isActive, updatedAt: new Date().toISOString() }).where(eq(tables.staff.id, req.params.id)).run();
    res.json({ message: "Status updated" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
