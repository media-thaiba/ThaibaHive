import { Router } from "express";
import { db, tables } from "../../db";
import { eq, and, or, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const approvalsRouter = Router();
approvalsRouter.use(authenticate);

approvalsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    if (!["admin", "super_admin", "hod", "principal"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const pendingLeaves = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.status, "pending")).orderBy(desc(tables.leaveRequests.createdAt)).all();
    const pendingBookings = await db.select().from(tables.bookings).where(eq(tables.bookings.status, "pending")).orderBy(desc(tables.bookings.createdAt)).all();
    const pendingExpenses = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.status, "pending")).orderBy(desc(tables.expenseClaims.createdAt)).all();
    const pendingPurchases = await db.select().from(tables.purchaseRequests).where(pendingStatus()).orderBy(desc(tables.purchaseRequests.createdAt)).all();

    const items = [
      ...pendingLeaves.map(l => ({ type: "leave", id: l.id, title: `Leave request`, status: l.status, createdAt: l.createdAt })),
      ...pendingBookings.map(b => ({ type: "booking", id: b.id, title: b.title, status: b.status, createdAt: b.createdAt })),
      ...pendingExpenses.map(e => ({ type: "expense", id: e.id, title: `Expense claim $${e.amount}`, status: e.status, createdAt: e.createdAt })),
      ...pendingPurchases.map(p => ({ type: "purchase", id: p.id, title: `Purchase: ${p.itemName}`, status: p.status, createdAt: p.createdAt })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const data = items.slice(offset, offset + limit);
    res.json({ data, total, page, limit });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

function pendingStatus() {
  return or(
    eq(tables.purchaseRequests.status, "pending_hod"),
    eq(tables.purchaseRequests.status, "pending_accounts"),
    eq(tables.purchaseRequests.status, "pending_purchase"),
  );
}

approvalsRouter.put("/:type/:id", async (req: AuthRequest, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const { type, id } = req.params;

    switch (type) {
      case "leave": {
        const existing = await db.select().from(tables.leaveRequests).where(eq(tables.leaveRequests.id, id)).get();
        if (!existing) return res.status(404).json({ error: "Not found" });
        const leaveUpdates: any = { status, reviewedById: req.user!.id, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (reviewNotes !== undefined) leaveUpdates.reviewNotes = reviewNotes;
        await db.update(tables.leaveRequests).set(leaveUpdates).where(eq(tables.leaveRequests.id, id)).run();
        break;
      }
      case "booking": {
        const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, id)).get();
        if (!existing) return res.status(404).json({ error: "Not found" });
        const bookingUpdates: any = { status, approvedById: req.user!.id, updatedAt: new Date().toISOString() };
        if (reviewNotes !== undefined) bookingUpdates.notes = reviewNotes;
        await db.update(tables.bookings).set(bookingUpdates).where(eq(tables.bookings.id, id)).run();
        break;
      }
      case "expense": {
        const existing = await db.select().from(tables.expenseClaims).where(eq(tables.expenseClaims.id, id)).get();
        if (!existing) return res.status(404).json({ error: "Not found" });
        const expenseUpdates: any = { status, reviewedById: req.user!.id, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (reviewNotes !== undefined) expenseUpdates.reviewNotes = reviewNotes;
        await db.update(tables.expenseClaims).set(expenseUpdates).where(eq(tables.expenseClaims.id, id)).run();
        break;
      }
      case "purchase": {
        const existing = await db.select().from(tables.purchaseRequests).where(eq(tables.purchaseRequests.id, id)).get();
        if (!existing) return res.status(404).json({ error: "Not found" });
        const stageField = existing.status === "pending_hod" ? "approvedByHodId" : existing.status === "pending_accounts" ? "approvedByAccountsId" : existing.status === "pending_purchase" ? "approvedByPurchaseId" : null;
        const updates: any = { status, updatedAt: new Date().toISOString() };
        if (reviewNotes !== undefined) updates.notes = reviewNotes;
        if (stageField) updates[stageField] = req.user!.id;
        if (status === "approved") updates.approvedAt = new Date().toISOString();
        await db.update(tables.purchaseRequests).set(updates).where(eq(tables.purchaseRequests.id, id)).run();
        break;
      }
      default: return res.status(400).json({ error: "Invalid approval type" });
    }
    res.json({ message: `${type} ${status}` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
