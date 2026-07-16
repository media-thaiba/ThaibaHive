import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db, tables } from "../../db";
import { eq, and, count, gte, lte, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";
import { createHmac } from "crypto";

export const attendanceRouter = Router();

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
attendanceRouter.use(authenticate);

const DEFAULT_SHIFT = { startTime: "09:00", endTime: "17:00", gracePeriodMinutes: 15 };

async function resolveShift(staffId: string, date: string) {
  // 1. Staff-specific shift assignment (most recent effectiveFrom <= date)
  const staffAssignment = await db
    .select({ shiftId: tables.staffShifts.shiftId, effectiveFrom: tables.staffShifts.effectiveFrom, effectiveTo: tables.staffShifts.effectiveTo })
    .from(tables.staffShifts)
    .where(
      and(
        eq(tables.staffShifts.staffId, staffId),
        lte(tables.staffShifts.effectiveFrom, date),
      )
    )
    .orderBy(tables.staffShifts.effectiveFrom)
    .all();

  // Get the latest assignment that covers this date
  const activeAssignment = [...staffAssignment]
    .reverse()
    .find((a) => !a.effectiveTo || a.effectiveTo >= date);

  if (activeAssignment) {
    const shift = await db.select().from(tables.shifts).where(eq(tables.shifts.id, activeAssignment.shiftId)).get();
    if (shift?.isActive) return shift;
  }

  // 2. Department-level shift
  const staffDept = await db
    .select({ departmentId: tables.staffDepartments.departmentId })
    .from(tables.staffDepartments)
    .where(eq(tables.staffDepartments.staffId, staffId))
    .limit(1)
    .get();
  if (staffDept?.departmentId) {
    const deptShift = await db
      .select()
      .from(tables.shifts)
      .where(and(eq(tables.shifts.departmentId, staffDept.departmentId), eq(tables.shifts.isActive, true)))
      .get();
    if (deptShift) return deptShift;
  }

  // 3. System-wide default shift (applicableToAll)
  const defaultShift = await db
    .select()
    .from(tables.shifts)
    .where(and(eq(tables.shifts.applicableToAll, true), eq(tables.shifts.isActive, true)))
    .get();
  if (defaultShift) return defaultShift;

  // 4. Hardcoded fallback
  return DEFAULT_SHIFT;
}

attendanceRouter.get("/my", async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate, page = "1", limit = "30" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions = [eq(tables.attendanceLogs.staffId, req.user!.id)];
    if (date) conditions.push(eq(tables.attendanceLogs.date, date as string));
    if (startDate) conditions.push(gte(tables.attendanceLogs.date, startDate as string));
    if (endDate) conditions.push(lte(tables.attendanceLogs.date, endDate as string));
    const logs = await db.select().from(tables.attendanceLogs).where(and(...conditions)).orderBy(desc(tables.attendanceLogs.date)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.attendanceLogs).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: logs, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

attendanceRouter.post("/check-in", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const { method, nfcTagId, qrCode, latitude: userLat, longitude: userLon } = req.body;

    if (!method || !["nfc", "qr"].includes(method)) {
      return res.status(400).json({ error: "Check-in method must be 'nfc' or 'qr'" });
    }

    if (method === "nfc" && !nfcTagId) {
      return res.status(400).json({ error: "NFC tag ID is required for NFC check-in" });
    }

    if (method === "qr" && !qrCode) {
      return res.status(400).json({ error: "QR code is required for QR check-in" });
    }

    // ─── NFC validation ───
    if (method === "nfc") {
      const user = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).get();
      if (user?.nfcTagId && user.nfcTagId === nfcTagId) {
        // Personal card match — valid
      } else {
        const location = await db.select().from(tables.attendanceLocations)
          .where(and(
            eq(tables.attendanceLocations.nfcTagId, nfcTagId),
            eq(tables.attendanceLocations.isActive, true),
          )).get();
        if (!location) {
          return res.status(403).json({ error: "NFC tag not registered to you or any active location" });
        }

        // Geofencing verification
        if (location.latitude !== null && location.longitude !== null) {
          if (userLat === undefined || userLon === undefined) {
            return res.status(400).json({ error: "Location coordinates (latitude & longitude) are required for this checkpoint" });
          }
          const dist = getDistanceMeters(Number(userLat), Number(userLon), location.latitude, location.longitude);
          const allowedRadius = location.radius || 100;
          if (dist > allowedRadius) {
            return res.status(403).json({ error: `Outside allowed check-in radius. Distance: ${Math.round(dist)}m, allowed: ${allowedRadius}m` });
          }
        }
      }
    }

    // ─── QR validation ───
    if (method === "qr") {
      let payload: { nonce: string; timestamp: string; locationId: string; hmac: string; validFor?: number };
      try {
        const json = JSON.parse(Buffer.from(qrCode, "base64url").toString("utf-8"));
        payload = json;
      } catch {
        return res.status(400).json({ error: "Invalid QR code format" });
      }

      if (!payload.nonce || !payload.timestamp || !payload.locationId || !payload.hmac) {
        return res.status(400).json({ error: "Invalid QR code payload" });
      }

      const location = await db.select().from(tables.attendanceLocations)
        .where(and(
          eq(tables.attendanceLocations.id, payload.locationId),
          eq(tables.attendanceLocations.isActive, true),
        )).get();
      if (!location) {
        return res.status(400).json({ error: "Invalid or inactive attendance location" });
      }

      const message = `${payload.nonce}:${payload.timestamp}:${payload.locationId}`;
      const expectedHmac = createHmac("sha256", location.qrSecret).update(message).digest("hex");
      if (payload.hmac !== expectedHmac) {
        return res.status(403).json({ error: "Invalid QR code signature" });
      }

      // Geofencing verification
      if (location.latitude !== null && location.longitude !== null) {
        if (userLat === undefined || userLon === undefined) {
          return res.status(400).json({ error: "Location coordinates (latitude & longitude) are required for this checkpoint" });
        }
        const dist = getDistanceMeters(Number(userLat), Number(userLon), location.latitude, location.longitude);
        const allowedRadius = location.radius || 100;
        if (dist > allowedRadius) {
          return res.status(403).json({ error: `Outside allowed check-in radius. Distance: ${Math.round(dist)}m, allowed: ${allowedRadius}m` });
        }
      }

      const validFor = payload.validFor || 30;
      const qrTime = new Date(payload.timestamp).getTime();
      const nowTime = Date.now();
      if (Math.abs(nowTime - qrTime) > validFor * 1000) {
        return res.status(400).json({ error: "QR code has expired" });
      }

      const usedNonce = await db.select().from(tables.usedNonces)
        .where(eq(tables.usedNonces.jti, payload.nonce)).get();
      if (usedNonce) {
        return res.status(400).json({ error: "QR code already used" });
      }

      await db.insert(tables.usedNonces).values({
        jti: payload.nonce,
        expiresAt: new Date(nowTime + 5 * 60 * 1000).toISOString(),
      }).run();
    }

    const existing = await db.select().from(tables.attendanceLogs).where(and(eq(tables.attendanceLogs.staffId, req.user!.id), eq(tables.attendanceLogs.date, today))).get();
    if (existing) return res.status(400).json({ error: "Already checked in today" });

    const shift = await resolveShift(req.user!.id, today);
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const checkInDate = new Date(now);
    const shiftStart = new Date(checkInDate);
    shiftStart.setHours(startH, startM, 0, 0);
    const graceEnd = new Date(shiftStart.getTime() + shift.gracePeriodMinutes * 60000);

    let status = "present";
    let lateMinutes = 0;
    if (checkInDate.getTime() > graceEnd.getTime()) {
      lateMinutes = Math.floor((checkInDate.getTime() - shiftStart.getTime()) / 60000);
      status = "late";
    }

    const id = uuid();
    await db.insert(tables.attendanceLogs).values({
      id,
      staffId: req.user!.id,
      date: today,
      checkIn: now,
      method,
      nfcTagId: nfcTagId || null,
      qrCode: qrCode || null,
      status,
      lateMinutes,
    }).run();
    const record = await db.select().from(tables.attendanceLogs).where(eq(tables.attendanceLogs.id, id)).get();
    res.status(201).json(record);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

attendanceRouter.post("/check-out", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const record = await db.select().from(tables.attendanceLogs).where(and(eq(tables.attendanceLogs.staffId, req.user!.id), eq(tables.attendanceLogs.date, today))).get();
    if (!record) return res.status(400).json({ error: "No check-in found for today" });
    if (record.checkOut) return res.status(400).json({ error: "Already checked out" });
    const checkInTime = new Date(record.checkIn!).getTime();
    const checkOutTime = new Date(now).getTime();
    const workedMinutes = Math.floor((checkOutTime - checkInTime) / 60000);

    const shift = await resolveShift(req.user!.id, today);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const checkOutDate = new Date(now);
    const shiftEnd = new Date(checkOutDate);
    shiftEnd.setHours(endH, endM, 0, 0);

    let earlyExitMinutes = 0;
    if (checkOutDate.getTime() < shiftEnd.getTime()) {
      earlyExitMinutes = Math.floor((shiftEnd.getTime() - checkOutDate.getTime()) / 60000);
    }

    await db.update(tables.attendanceLogs).set({ checkOut: now, workedMinutes, earlyExitMinutes }).where(eq(tables.attendanceLogs.id, record.id)).run();
    const updated = await db.select().from(tables.attendanceLogs).where(eq(tables.attendanceLogs.id, record.id)).get();
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

attendanceRouter.get("/logs", requireRole("admin", "super_admin"), async (req: AuthRequest, res) => {
  try {
    const { staffId, date, startDate, endDate, status, page = "1", limit = "50" } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const conditions: any[] = [];
    if (staffId) conditions.push(eq(tables.attendanceLogs.staffId, staffId as string));
    if (date) conditions.push(eq(tables.attendanceLogs.date, date as string));
    if (startDate) conditions.push(gte(tables.attendanceLogs.date, startDate as string));
    if (endDate) conditions.push(lte(tables.attendanceLogs.date, endDate as string));
    if (status) conditions.push(eq(tables.attendanceLogs.status, status as string));
    const logs = await db.select().from(tables.attendanceLogs).where(and(...conditions)).orderBy(desc(tables.attendanceLogs.date)).limit(l).offset((p - 1) * l).all();
    const totalResult = await db.select({ count: count() }).from(tables.attendanceLogs).where(and(...conditions)).get();
    const total = totalResult?.count ?? 0;
    res.json({ data: logs, total, page: p, limit: l });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

attendanceRouter.get("/stats", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = await db.select().from(tables.attendanceLogs).where(eq(tables.attendanceLogs.date, today)).all();
    const present = todayLogs.filter(l => l.status === "present").length;
    const late = todayLogs.filter(l => (l.lateMinutes || 0) > 0).length;
    const absent = todayLogs.filter(l => l.status === "absent").length;
    const myToday = await db.select().from(tables.attendanceLogs).where(and(eq(tables.attendanceLogs.staffId, req.user!.id), eq(tables.attendanceLogs.date, today))).get();
    res.json({ today: { total: todayLogs.length, present, late, absent }, myToday: myToday || null });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
