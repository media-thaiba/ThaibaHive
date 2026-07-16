import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);

vehiclesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { type, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [eq(tables.vehicles.isActive, true)];
    if (type) conditions.push(eq(tables.vehicles.type, type as string));
    const items = await db.select().from(tables.vehicles).where(and(...conditions)).orderBy(desc(tables.vehicles.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalVehResult = await db.select({ count: count() }).from(tables.vehicles).where(and(...conditions)).get();
    const total = totalVehResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.post("/", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { registrationNumber, model, type, capacity, fuelType, institutionId, notes } = req.body;
    if (!registrationNumber || !model || !type) return res.status(400).json({ error: "registrationNumber, model, type required" });
    const id = uuid();
    await db.insert(tables.vehicles).values({ id, registrationNumber, model, type, capacity: capacity || 1, fuelType: fuelType || "petrol", institutionId, notes }).run();
    const item = await db.select().from(tables.vehicles).where(eq(tables.vehicles.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.put("/:id", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { registrationNumber, model, type, capacity, fuelType, isActive, notes } = req.body;
    const updates: any = {};
    if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber;
    if (model !== undefined) updates.model = model;
    if (type !== undefined) updates.type = type;
    if (capacity !== undefined) updates.capacity = capacity;
    if (fuelType !== undefined) updates.fuelType = fuelType;
    if (isActive !== undefined) updates.isActive = isActive;
    if (notes !== undefined) updates.notes = notes;
    await db.update(tables.vehicles).set(updates).where(eq(tables.vehicles.id, req.params.id)).run();
    const item = await db.select().from(tables.vehicles).where(eq(tables.vehicles.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.get("/bookings", async (req: AuthRequest, res) => {
  try {
    const { vehicleId, status, date, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (vehicleId) conditions.push(eq(tables.vehicleBookings.vehicleId, vehicleId as string));
    if (status) conditions.push(eq(tables.vehicleBookings.status, status as string));
    if (date) conditions.push(eq(tables.vehicleBookings.date, date as string));
    const items = await db.select().from(tables.vehicleBookings).where(and(...conditions)).orderBy(desc(tables.vehicleBookings.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalBookResult = await db.select({ count: count() }).from(tables.vehicleBookings).where(and(...conditions)).get();
    const total = totalBookResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.post("/bookings", async (req: AuthRequest, res) => {
  try {
    const { vehicleId, date, startTime, endTime, purpose, destination, notes } = req.body;
    if (!vehicleId || !date || !startTime || !purpose) return res.status(400).json({ error: "Missing required fields" });
    const id = uuid();
    await db.insert(tables.vehicleBookings).values({ id, vehicleId, bookedById: req.user!.id, date, startTime, endTime, purpose, destination, notes }).run();
    const item = await db.select().from(tables.vehicleBookings).where(eq(tables.vehicleBookings.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.put("/bookings/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(tables.vehicleBookings).where(eq(tables.vehicleBookings.id, req.params.id)).get();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (req.user!.role === "staff" && existing.bookedById !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    const { status, notes } = req.body;
    const updates: any = {};
    if (status) { updates.status = status; updates.approvedById = req.user!.id; }
    if (notes !== undefined) updates.notes = notes;
    await db.update(tables.vehicleBookings).set(updates).where(eq(tables.vehicleBookings.id, req.params.id)).run();
    const item = await db.select().from(tables.vehicleBookings).where(eq(tables.vehicleBookings.id, req.params.id)).get();
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.get("/logs", async (req: AuthRequest, res) => {
  try {
    const { vehicleId, page = "1", limit = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (vehicleId) conditions.push(eq(tables.vehicleLogs.vehicleId, vehicleId as string));
    const items = await db.select().from(tables.vehicleLogs).where(and(...conditions)).orderBy(desc(tables.vehicleLogs.createdAt)).limit(l).offset((p - 1) * l).all();
    const totalLogResult = await db.select({ count: count() }).from(tables.vehicleLogs).where(and(...conditions)).get();
    const total = totalLogResult?.count ?? 0;
    res.json({ data: items, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.post("/logs", async (req: AuthRequest, res) => {
  try {
    const { vehicleId, driverId, date, startOdometer, endOdometer, distanceKm, fuelLitres, fuelCost, route, notes } = req.body;
    if (!vehicleId || !driverId || !date) return res.status(400).json({ error: "vehicleId, driverId, date required" });
    const id = uuid();
    await db.insert(tables.vehicleLogs).values({ id, vehicleId, driverId, date, startOdometer, endOdometer, distanceKm, fuelLitres, fuelCost, route, notes }).run();
    const item = await db.select().from(tables.vehicleLogs).where(eq(tables.vehicleLogs.id, id)).get();
    res.status(201).json(item);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
