import { describe, it, expect, beforeEach } from "@jest/globals";
import { createClient } from "@libsql/client";
import {
  issueGatePass,
  reissueGatePass,
  scanGatePass,
  hashQrSecret
} from "@/lib/hostel";

describe("Hostel CAS Gate Pass & Scan Engine (SQLite / LibSQL)", () => {
  let client: ReturnType<typeof createClient>;
  const instId = `inst_gate_${Date.now()}`;
  const studentId = `stud_gate_${Date.now()}`;
  const staffId = `stf_gate_${Date.now()}`;
  const leaveId = `leave_gate_${Date.now()}`;

  beforeEach(async () => {
    client = createClient({ url: ":memory:" });
    await client.execute("PRAGMA foreign_keys = ON;");

    // Stubs
    await client.execute(`CREATE TABLE institutions (id TEXT PRIMARY KEY, name TEXT NOT NULL);`);
    await client.execute(`INSERT INTO institutions (id, name) VALUES ('${instId}', 'Gate Inst');`);

    await client.execute(`
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        full_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        UNIQUE(institution_id, id)
      );
    `);
    await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${studentId}', '${instId}', 'Gate Student', 'male');`);

    await client.execute(`
      CREATE TABLE staff_institutions (
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        staff_id TEXT NOT NULL,
        role TEXT NOT NULL,
        UNIQUE(institution_id, staff_id)
      );
    `);
    await client.execute(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', '${staffId}', 'warden');`);

    await client.execute(`
      CREATE TABLE hostel_leaves (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        student_id TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        status TEXT NOT NULL,
        expected_out_at TEXT NOT NULL,
        expected_in_at TEXT NOT NULL,
        actual_out_at TEXT,
        actual_in_at TEXT,
        authorized_pickup_name TEXT NOT NULL,
        authorized_pickup_phone TEXT NOT NULL,
        parent_consent_received INTEGER DEFAULT 0 NOT NULL,
        approved_staff_id TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(institution_id, id),
        UNIQUE(institution_id, id, student_id),
        FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
        FOREIGN KEY (institution_id, approved_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
      );
    `);
    await client.execute(`
      INSERT INTO hostel_leaves (
        id, institution_id, student_id, leave_type, status,
        expected_out_at, expected_in_at, authorized_pickup_name,
        authorized_pickup_phone, parent_consent_received, approved_staff_id,
        approved_at, created_at
      ) VALUES (
        '${leaveId}', '${instId}', '${studentId}', 'outing', 'approved',
        '2026-10-25T10:00:00.000Z', '2026-10-25T18:00:00.000Z', 'Parent One',
        '+919876543210', 1, '${staffId}', '2026-10-25T09:00:00.000Z', '2026-10-25T08:00:00.000Z'
      );
    `);

    // Gate passes and gate logs tables
    await client.execute(`
      CREATE TABLE hostel_gate_passes (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        leave_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        pass_number TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        status TEXT DEFAULT 'issued' NOT NULL,
        issued_staff_id TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        revoked_at TEXT,
        revoked_staff_id TEXT,
        revoke_reason TEXT,
        UNIQUE(institution_id, id),
        FOREIGN KEY (institution_id, leave_id, student_id) REFERENCES hostel_leaves(institution_id, id, student_id) ON DELETE RESTRICT,
        FOREIGN KEY (institution_id, issued_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
      );
    `);
    await client.execute(`CREATE UNIQUE INDEX idx_one_live_pass_per_leave ON hostel_gate_passes (institution_id, leave_id) WHERE status != 'revoked';`);

    await client.execute(`
      CREATE TABLE hostel_gate_logs (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        pass_id TEXT,
        direction TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        received_at TEXT NOT NULL,
        device_id TEXT NOT NULL,
        guard_staff_id TEXT NOT NULL,
        verification_result TEXT NOT NULL,
        override_reason TEXT,
        idempotency_key TEXT NOT NULL,
        UNIQUE(institution_id, idempotency_key),
        FOREIGN KEY (institution_id, pass_id) REFERENCES hostel_gate_passes(institution_id, id) ON DELETE RESTRICT,
        FOREIGN KEY (institution_id, guard_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
      );
    `);
  });

  describe("Issue & CAS Re-Issue Lifecycle", () => {
    it("issues initial gate pass with SHA-256 token hash", async () => {
      const qrSecret = "secret_qr_token_12345";
      const res = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0001",
        rawQrSecret: qrSecret,
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(true);
      expect(res.passId).toBeDefined();

      const rows = await client.execute({
        sql: `SELECT * FROM hostel_gate_passes WHERE id = ?;`,
        args: [res.passId!]
      });
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0].status).toBe("issued");
      expect(rows.rows[0].token_hash).toBe(hashQrSecret(qrSecret));
    });

    it("reissues gate pass atomically using CAS and enforces single-live-pass invariant", async () => {
      // 1. Issue original pass
      const pass1 = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0001",
        rawQrSecret: "qr_secret_original",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });
      expect(pass1.success).toBe(true);

      // 2. Reissue (e.g. damaged device or lost token)
      const reissueRes = await reissueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        oldPassId: pass1.passId!,
        staffId,
        newPassNumber: "GP-2026-0001-R1",
        rawQrSecret: "qr_secret_replacement",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        issuedAt: "2026-10-25T09:30:00.000Z",
      }, { isPostgres: false });
      expect(reissueRes.success).toBe(true);
      expect(reissueRes.passId).toBeDefined();
      expect(reissueRes.passId).not.toBe(pass1.passId);

      // 3. Verify old pass is revoked
      const oldRows = await client.execute({
        sql: `SELECT status, revoke_reason FROM hostel_gate_passes WHERE id = ?;`,
        args: [pass1.passId!]
      });
      expect(oldRows.rows[0].status).toBe("revoked");
      expect(oldRows.rows[0].revoke_reason).toBe("Reissued");

      // 4. Verify new pass is issued
      const newRows = await client.execute({
        sql: `SELECT status, token_hash FROM hostel_gate_passes WHERE id = ?;`,
        args: [reissueRes.passId!]
      });
      expect(newRows.rows[0].status).toBe("issued");
      expect(newRows.rows[0].token_hash).toBe(hashQrSecret("qr_secret_replacement"));

      // 5. Verify exactly 1 live pass exists for this leave
      const livePasses = await client.execute({
        sql: `SELECT count(*) as live_count FROM hostel_gate_passes WHERE leave_id = ? AND status != 'revoked';`,
        args: [leaveId]
      });
      expect(Number((livePasses.rows[0] as any).live_count)).toBe(1);
    });

    it("rejects reissuing a pass that has already been checked in (used_in)", async () => {
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0002",
        rawQrSecret: "qr_test_in",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: new Date().toISOString(),
      }, { isPostgres: false });

      // Mark used_in
      await client.execute({
        sql: `UPDATE hostel_gate_passes SET status = 'used_in' WHERE id = ?;`,
        args: [pass.passId!]
      });

      const reissueRes = await reissueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        oldPassId: pass.passId!,
        staffId,
        newPassNumber: "GP-2026-0002-R1",
        rawQrSecret: "qr_new",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        issuedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(reissueRes.success).toBe(false);
      expect(reissueRes.error).toContain("used_in");
    });
  });

  describe("Gate Scanner & Verification Log Invariants", () => {
    it("successfully verifies valid QR scan and transitions status to used_out", async () => {
      const qrSecret = "my_valid_secret_qr";
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0003",
        rawQrSecret: qrSecret,
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });

      const scanRes = await scanGatePass(client, {
        institutionId: instId,
        passId: pass.passId!,
        rawQrSecret: qrSecret,
        direction: "out",
        scannedAt: "2026-10-25T10:15:00.000Z",
        receivedAt: "2026-10-25T10:15:02.000Z",
        deviceId: "GATE_POS_01",
        guardStaffId: staffId,
        idempotencyKey: `idem_scan_${Date.now()}`,
      }, { isPostgres: false });

      expect(scanRes.success).toBe(true);
      expect(scanRes.verificationResult).toBe("verified");

      const passRows = await client.execute({
        sql: `SELECT status FROM hostel_gate_passes WHERE id = ?;`,
        args: [pass.passId!]
      });
      expect(passRows.rows[0].status).toBe("used_out");

      const logRows = await client.execute({
        sql: `SELECT * FROM hostel_gate_logs WHERE id = ?;`,
        args: [scanRes.logId!]
      });
      expect(logRows.rows.length).toBe(1);
      expect(logRows.rows[0].direction).toBe("out");
      expect(logRows.rows[0].verification_result).toBe("verified");
    });

    it("rejects expired pass with expired_rejected verification result", async () => {
      const qrSecret = "secret_expired";
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0004",
        rawQrSecret: qrSecret,
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });

      const scanRes = await scanGatePass(client, {
        institutionId: instId,
        passId: pass.passId!,
        rawQrSecret: qrSecret,
        direction: "out",
        scannedAt: "2026-10-25T18:30:00.000Z", // Past 18:00
        receivedAt: "2026-10-25T18:30:02.000Z",
        deviceId: "GATE_POS_01",
        guardStaffId: staffId,
        idempotencyKey: `idem_exp_${Date.now()}`,
      }, { isPostgres: false });

      expect(scanRes.success).toBe(false);
      expect(scanRes.verificationResult).toBe("expired_rejected");
    });

    it("records manual_override by security guard when authorized", async () => {
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0005",
        rawQrSecret: "secret_manual",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });

      const scanRes = await scanGatePass(client, {
        institutionId: instId,
        passId: pass.passId!,
        direction: "in",
        scannedAt: "2026-10-25T19:00:00.000Z",
        receivedAt: "2026-10-25T19:00:01.000Z",
        deviceId: "GATE_POS_01",
        guardStaffId: staffId,
        idempotencyKey: `idem_man_${Date.now()}`,
        manualOverride: true,
        overrideReason: "Student arrived with parents in emergency vehicle",
      }, { isPostgres: false });

      expect(scanRes.success).toBe(true);
      expect(scanRes.verificationResult).toBe("manual_override");

      const logRows = await client.execute({
        sql: `SELECT override_reason FROM hostel_gate_logs WHERE id = ?;`,
        args: [scanRes.logId!]
      });
      expect(logRows.rows[0].override_reason).toBe("Student arrived with parents in emergency vehicle");
    });

    it("rejects scan with tampered when rawQrSecret is empty or non-string", async () => {
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0006",
        rawQrSecret: "valid_secret_123",
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });

      const scanRes = await scanGatePass(client, {
        institutionId: instId,
        passId: pass.passId!,
        rawQrSecret: "",
        direction: "out",
        scannedAt: "2026-10-25T10:15:00.000Z",
        receivedAt: "2026-10-25T10:15:02.000Z",
        deviceId: "GATE_POS_01",
        guardStaffId: staffId,
        idempotencyKey: `idem_empty_${Date.now()}`,
      }, { isPostgres: false });

      expect(scanRes.success).toBe(false);
      expect(scanRes.verificationResult).toBe("tampered");
    });

    it("rejects scan with tampered when pass status is already used_in", async () => {
      const qrSecret = "secret_used_in_test";
      const pass = await issueGatePass(client, {
        institutionId: instId,
        leaveId,
        studentId,
        passNumber: "GP-2026-0007",
        rawQrSecret: qrSecret,
        validFrom: "2026-10-25T10:00:00.000Z",
        validUntil: "2026-10-25T18:00:00.000Z",
        staffId,
        issuedAt: "2026-10-25T09:00:00.000Z",
      }, { isPostgres: false });

      // Simulate full roundtrip completion (used_in)
      await client.execute({
        sql: `UPDATE hostel_gate_passes SET status = 'used_in' WHERE id = ?;`,
        args: [pass.passId!]
      });

      const scanRes = await scanGatePass(client, {
        institutionId: instId,
        passId: pass.passId!,
        rawQrSecret: qrSecret,
        direction: "out",
        scannedAt: "2026-10-25T10:30:00.000Z",
        receivedAt: "2026-10-25T10:30:02.000Z",
        deviceId: "GATE_POS_01",
        guardStaffId: staffId,
        idempotencyKey: `idem_usedin_${Date.now()}`,
      }, { isPostgres: false });

      expect(scanRes.success).toBe(false);
      expect(scanRes.verificationResult).toBe("tampered");
    });
  });
});
