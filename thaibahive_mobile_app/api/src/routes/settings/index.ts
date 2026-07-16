import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, tables } from "../../db";
import { eq } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.put("/profile", async (req: AuthRequest, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "phone", "designation", "dateOfBirth", "avatarUrl", "dateOfJoining", "qualifications", "skills", "languages", "emergencyContactName", "emergencyContactPhone", "aadhaar", "pan", "bankAccount", "ifscCode", "biography", "teachingSubjects"];
    const updates: any = { updatedAt: new Date().toISOString() };
    for (const f of allowedFields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
    await db.update(tables.staff).set(updates).where(eq(tables.staff.id, req.user!.id)).run();
    const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).get();
    const { passwordHash, ...safeUser } = user!;
    res.json(safeUser);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

settingsRouter.put("/password", async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password required" });
    const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).get();
    if (!user || !user.passwordHash) return res.status(400).json({ error: "Password not set" });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(tables.staff).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(tables.staff.id, req.user!.id)).run();
    res.json({ message: "Password updated" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

settingsRouter.get("/preferences", async (req: AuthRequest, res) => {
  try {
    const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).get();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      languages: user.languages,
      theme: "light",
      notifications: true,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

settingsRouter.put("/preferences", async (req: AuthRequest, res) => {
  try {
    const { languages } = req.body;
    await db.update(tables.staff).set({ languages, updatedAt: new Date().toISOString() }).where(eq(tables.staff.id, req.user!.id)).run();
    res.json({ message: "Preferences updated" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
