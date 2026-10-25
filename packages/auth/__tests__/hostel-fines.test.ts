import { describe, it, expect, beforeEach } from "@jest/globals";
import { createClient } from "@libsql/client";
import {
  calculateLateReturnFine,
  HostelSettings,
  assessFine,
  waiveFine
} from "@/lib/hostel";

describe("Hostel Fine Calculation & Append-Only Ledger Suite", () => {
  const defaultSettings: HostelSettings = {
    lateFineRatePerDayMinor: 5000, // ₹50.00
    gracePeriodMinutes: 60,
    roundingRule: "ceil",
  };

  describe("Table-Driven Late-Fine Calculator (8 Core Cases)", () => {
    it("Case 1: throws error when hostel settings are missing", () => {
      expect(() => {
        calculateLateReturnFine(
          "2026-10-25T18:00:00.000Z",
          "2026-10-25T19:30:00.000Z",
          null as any
        );
      }).toThrow("Hostel settings not configured for institution");
    });

    it("Case 2: returns 0 fine for on-time arrival (early by 10 mins)", () => {
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-25T17:50:00.000Z",
        defaultSettings
      );
      expect(res.daysLate).toBe(0);
      expect(res.totalAmountMinor).toBe(0);
      expect(res.ratePerDayMinor).toBe(5000);
    });

    it("Case 3: returns 0 fine when late arrival is exactly within grace period (60 mins late)", () => {
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-25T19:00:00.000Z",
        defaultSettings
      );
      expect(res.daysLate).toBe(0);
      expect(res.totalAmountMinor).toBe(0);
    });

    it("Case 4: assesses exactly 1 day fine when exceeding grace by 1 minute (61 mins late, ceil)", () => {
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-25T19:01:00.000Z",
        defaultSettings
      );
      expect(res.daysLate).toBe(1);
      expect(res.totalAmountMinor).toBe(5000);
    });

    it("Case 5: assesses exactly 1 day fine for exactly 24h past grace (60 + 1440 mins late)", () => {
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-26T19:00:00.000Z", // 25 hours = 1500 mins late
        defaultSettings
      );
      expect(res.daysLate).toBe(1);
      expect(res.totalAmountMinor).toBe(5000);
    });

    it("Case 6: assesses 2 days fine for 24h + 1m past grace with roundingRule='ceil'", () => {
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-26T19:01:00.000Z", // 25 hours + 1 min = 1501 mins late
        defaultSettings
      );
      expect(res.daysLate).toBe(2);
      expect(res.totalAmountMinor).toBe(10000);
    });

    it("Case 7: assesses 1 day fine for 24h + 1m past grace with roundingRule='floor'", () => {
      const floorSettings: HostelSettings = {
        ...defaultSettings,
        roundingRule: "floor",
      };
      const res = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-26T19:01:00.000Z",
        floorSettings
      );
      expect(res.daysLate).toBe(1);
      expect(res.totalAmountMinor).toBe(5000);
    });

    it("Case 8: guarantees replay idempotency yielding byte-identical results", () => {
      const res1 = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-26T19:01:00.000Z",
        defaultSettings
      );
      const res2 = calculateLateReturnFine(
        "2026-10-25T18:00:00.000Z",
        "2026-10-26T19:01:00.000Z",
        defaultSettings
      );
      expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
      expect(res1.daysLate).toBe(2);
      expect(res1.totalAmountMinor).toBe(10000);
    });
  });

  describe("Append-Only Fine Ledger Service (SQLite / LibSQL)", () => {
    let client: ReturnType<typeof createClient>;
    const instId = `inst_fines_${Date.now()}`;
    const studentId = `stud_fines_${Date.now()}`;
    const staffId = `stf_fines_${Date.now()}`;

    beforeEach(async () => {
      client = createClient({ url: ":memory:" });
      await client.execute("PRAGMA foreign_keys = ON;");

      // Stubs
      await client.execute(`CREATE TABLE institutions (id TEXT PRIMARY KEY, name TEXT NOT NULL);`);
      await client.execute(`INSERT INTO institutions (id, name) VALUES ('${instId}', 'Fine Inst');`);

      await client.execute(`
        CREATE TABLE students (
          id TEXT PRIMARY KEY,
          institution_id TEXT NOT NULL REFERENCES institutions(id),
          full_name TEXT NOT NULL,
          gender TEXT NOT NULL,
          UNIQUE(institution_id, id)
        );
      `);
      await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${studentId}', '${instId}', 'Fine Student', 'male');`);

      await client.execute(`
        CREATE TABLE staff_institutions (
          institution_id TEXT NOT NULL REFERENCES institutions(id),
          staff_id TEXT NOT NULL,
          role TEXT NOT NULL,
          UNIQUE(institution_id, staff_id)
        );
      `);
      await client.execute(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', '${staffId}', 'warden');`);

      // Hostel Fines & Fine Actions tables
      await client.execute(`
        CREATE TABLE hostel_fines (
          id TEXT PRIMARY KEY NOT NULL,
          institution_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          leave_id TEXT,
          fine_category TEXT NOT NULL,
          days_late INTEGER DEFAULT 0 NOT NULL,
          rate_per_day INTEGER DEFAULT 0 NOT NULL,
          total_amount INTEGER NOT NULL,
          paid_amount INTEGER DEFAULT 0 NOT NULL,
          status TEXT DEFAULT 'assessed' NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(institution_id, id),
          FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT
        );
      `);

      await client.execute(`
        CREATE TABLE hostel_fine_actions (
          id TEXT PRIMARY KEY NOT NULL,
          institution_id TEXT NOT NULL,
          fine_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          actor_type TEXT NOT NULL,
          actor_staff_id TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(institution_id, idempotency_key),
          FOREIGN KEY (institution_id, fine_id) REFERENCES hostel_fines(institution_id, id) ON DELETE RESTRICT,
          FOREIGN KEY (institution_id, actor_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
        );
      `);
    });

    it("assesses late fine and records an immutable ledger entry", async () => {
      const now = new Date().toISOString();
      const res = await assessFine(client, {
        institutionId: instId,
        studentId,
        fineCategory: "late_return",
        daysLate: 2,
        ratePerDayMinor: 5000,
        totalAmountMinor: 10000,
        actorType: "system",
        idempotencyKey: `idem_assess_${Date.now()}`,
        createdAt: now,
      }, { isPostgres: false });

      expect(res.success).toBe(true);
      expect(res.fineId).toBeDefined();
      expect(res.actionId).toBeDefined();

      const fineRows = await client.execute({
        sql: `SELECT * FROM hostel_fines WHERE id = ?;`,
        args: [res.fineId!]
      });
      expect(fineRows.rows.length).toBe(1);
      expect(fineRows.rows[0].status).toBe("assessed");
      expect(Number(fineRows.rows[0].total_amount)).toBe(10000);

      const actionRows = await client.execute({
        sql: `SELECT * FROM hostel_fine_actions WHERE fine_id = ?;`,
        args: [res.fineId!]
      });
      expect(actionRows.rows.length).toBe(1);
      expect(actionRows.rows[0].action_type).toBe("ASSESSED");
      expect(actionRows.rows[0].actor_type).toBe("system");
      expect(actionRows.rows[0].actor_staff_id).toBeNull();
      expect(typeof actionRows.rows[0].payload_hash).toBe("string");
    });

    it("waives a fine and records a staff waiver action in the immutable ledger", async () => {
      const now = new Date().toISOString();
      const assessRes = await assessFine(client, {
        institutionId: instId,
        studentId,
        fineCategory: "property_damage",
        totalAmountMinor: 15000,
        actorType: "staff",
        actorStaffId: staffId,
        idempotencyKey: `idem_prop_${Date.now()}`,
        createdAt: now,
      }, { isPostgres: false });

      expect(assessRes.success).toBe(true);

      const waiveRes = await waiveFine(client, {
        institutionId: instId,
        fineId: assessRes.fineId!,
        waiveAmountMinor: 15000,
        actorStaffId: staffId,
        reason: "Principal approved medical consideration",
        idempotencyKey: `idem_waive_${Date.now()}`,
        createdAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(waiveRes.success).toBe(true);

      const fineRows = await client.execute({
        sql: `SELECT status FROM hostel_fines WHERE id = ?;`,
        args: [assessRes.fineId!]
      });
      expect(fineRows.rows[0].status).toBe("waived");

      const actionRows = await client.execute({
        sql: `SELECT * FROM hostel_fine_actions WHERE fine_id = ? ORDER BY created_at ASC;`,
        args: [assessRes.fineId!]
      });
      expect(actionRows.rows.length).toBe(2);
      expect(actionRows.rows[0].action_type).toBe("ASSESSED");
      expect(actionRows.rows[1].action_type).toBe("WAIVED");
      expect(actionRows.rows[1].actor_staff_id).toBe(staffId);
    });

    it("rejects duplicate waiver attempts with idempotency or status error", async () => {
      const now = new Date().toISOString();
      const assessRes = await assessFine(client, {
        institutionId: instId,
        studentId,
        fineCategory: "misconduct",
        totalAmountMinor: 2000,
        actorType: "staff",
        actorStaffId: staffId,
        idempotencyKey: `idem_misc_${Date.now()}`,
        createdAt: now,
      }, { isPostgres: false });

      const waiveRes = await waiveFine(client, {
        institutionId: instId,
        fineId: assessRes.fineId!,
        waiveAmountMinor: 2000,
        actorStaffId: staffId,
        reason: "First offense pardon",
        idempotencyKey: `idem_waive_1_${Date.now()}`,
        createdAt: now,
      }, { isPostgres: false });
      expect(waiveRes.success).toBe(true);

      // Attempt second waiver on already waived fine
      const duplicateRes = await waiveFine(client, {
        institutionId: instId,
        fineId: assessRes.fineId!,
        waiveAmountMinor: 2000,
        actorStaffId: staffId,
        reason: "Second waiver attempt",
        idempotencyKey: `idem_waive_2_${Date.now()}`,
        createdAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("Cannot waive fine with status 'waived'");
    });

    it("fails closed on waiver when fine is paid or modified concurrently (CAS guard)", async () => {
      const now = new Date().toISOString();
      const assessRes = await assessFine(client, {
        institutionId: instId,
        studentId,
        fineCategory: "property_damage",
        totalAmountMinor: 5000,
        actorType: "staff",
        actorStaffId: staffId,
        idempotencyKey: `idem_paid_${Date.now()}`,
        createdAt: now,
      }, { isPostgres: false });

      // Mark fine as paid directly
      await client.execute({
        sql: `UPDATE hostel_fines SET status = 'paid', paid_amount = 5000 WHERE id = ?;`,
        args: [assessRes.fineId!]
      });

      const waiveRes = await waiveFine(client, {
        institutionId: instId,
        fineId: assessRes.fineId!,
        waiveAmountMinor: 5000,
        actorStaffId: staffId,
        reason: "Late waiver attempt on settled fine",
        idempotencyKey: `idem_waive_paid_${Date.now()}`,
        createdAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(waiveRes.success).toBe(false);
      expect(waiveRes.error).toMatch(/paid/i);
    });
  });
});
