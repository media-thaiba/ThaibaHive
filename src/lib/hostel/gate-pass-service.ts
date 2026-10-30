import crypto from "crypto";
import {
  IssuePassParams,
  ReissuePassParams,
  GatePassResult,
  ScanGatePassParams,
  ScanGatePassResult
} from "./types";


function isPostgresConnection(client: any): boolean {
  if (!client) return false;
  if (typeof client.query === "function" && typeof client.execute !== "function") return true;
  if (typeof client.connect === "function") return true;
  const dialectName = client?.dialect?.constructor?.name?.toLowerCase() || "";
  const sessionName = client?.session?.constructor?.name?.toLowerCase() || "";
  if (dialectName.includes("pg") || sessionName.includes("pg")) return true;
  if (client?.session?.client?.execProtocol || client?.session?.client?.waitReady !== undefined) return true;
  return false;
}

async function acquirePgClient(client: any): Promise<{ conn: any; release: () => void }> {
  if (typeof client?.connect === "function" && typeof client?.release !== "function") {
    const conn = await client.connect();
    return { conn, release: () => conn.release() };
  }
  return { conn: client, release: () => {} };
}

export function hashQrSecret(rawSecret: string): string {
  return crypto.createHash("sha256").update(rawSecret).digest("hex");
}

function safeTimingHashEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== 64 || b.length !== 64) return false;
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== 32 || bufB.length !== 32) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function issueGatePass(
  client: any,
  params: IssuePassParams,
  options?: { isPostgres?: boolean }
): Promise<GatePassResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const {
    institutionId, leaveId, studentId, passNumber, rawQrSecret,
    validFrom, validUntil, staffId, issuedAt
  } = params;

  const tokenHash = hashQrSecret(rawQrSecret);
  const passId = `pass-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SET LOCAL lock_timeout = '5s';");
      await conn.query("SET LOCAL statement_timeout = '10s';");
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      await conn.query(`
        INSERT INTO hostel_gate_passes (
          id, institution_id, leave_id, student_id, pass_number,
          token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9, $10);
      `, [passId, institutionId, leaveId, studentId, passNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]);

      await conn.query("COMMIT;");
      return { success: true, passId };
    } catch (err: any) {
      if (ownsTx) {
        try { await conn.query("ROLLBACK;"); } catch {}
      }
      return { success: false, error: err.message };
    } finally {
      release();
    }
  }

  // SQLite / LibSQL
  try {
    await client.execute({
      sql: `
        INSERT INTO hostel_gate_passes (
          id, institution_id, leave_id, student_id, pass_number,
          token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?);
      `,
      args: [passId, institutionId, leaveId, studentId, passNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]
    });

    return { success: true, passId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Reissues an active gate pass using Compare-And-Swap (CAS) to revoke the previous
 * pass and insert a new pass with a fresh SHA-256 token hash in the same transaction.
 */
export async function reissueGatePass(
  client: any,
  params: ReissuePassParams,
  options?: { isPostgres?: boolean }
): Promise<GatePassResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const {
    institutionId, leaveId, studentId, oldPassId, staffId,
    newPassNumber, rawQrSecret, validFrom, validUntil, issuedAt
  } = params;

  const tokenHash = hashQrSecret(rawQrSecret);
  const newPassId = `pass-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SET LOCAL lock_timeout = '5s';");
      await conn.query("SET LOCAL statement_timeout = '10s';");
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Check existing pass status
      const oldRes = await conn.query(`
        SELECT id, status FROM hostel_gate_passes WHERE id = $1 AND institution_id = $2;
      `, [oldPassId, institutionId]);

      if (oldRes.rows.length === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Old pass not found." };
      }

      const oldStatus = oldRes.rows[0].status;
      if (oldStatus === "used_in") {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Cannot reissue a pass for a student who has already checked in (used_in)." };
      }
      if (oldStatus === "revoked") {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Cannot reissue a pass that is already revoked." };
      }

      // 2. CAS revocation
      const casRes = await conn.query(`
        UPDATE hostel_gate_passes 
        SET status = 'revoked', revoked_at = $1, revoked_staff_id = $2, revoke_reason = 'Reissued'
        WHERE id = $3 AND institution_id = $4 AND status IN ('issued', 'used_out');
      `, [issuedAt, staffId, oldPassId, institutionId]);

      const affected = casRes.rowCount ?? (casRes as any).affectedRows ?? 0;
      if (affected === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "CAS concurrency conflict: pass status changed concurrently." };
      }

      // 3. Insert new pass
      await conn.query(`
        INSERT INTO hostel_gate_passes (
          id, institution_id, leave_id, student_id, pass_number,
          token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9, $10);
      `, [newPassId, institutionId, leaveId, studentId, newPassNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]);

      await conn.query("COMMIT;");
      return { success: true, passId: newPassId };
    } catch (err: any) {
      if (ownsTx) {
        try { await conn.query("ROLLBACK;"); } catch {}
      }
      return { success: false, error: err.message };
    } finally {
      release();
    }
  }

  // SQLite / LibSQL
  let ownsSqliteTx = false;
  try {
    if (typeof client.execute === "function") {
      try {
        await client.execute("BEGIN IMMEDIATE;");
        ownsSqliteTx = true;
      } catch {
        // Already in transaction
      }
    }

    const oldRes = await client.execute({
      sql: `SELECT id, status FROM hostel_gate_passes WHERE id = ? AND institution_id = ?;`,
      args: [oldPassId, institutionId]
    });

    if (oldRes.rows.length === 0) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Old pass not found." };
    }

    const oldStatus = (oldRes.rows[0] as any).status;
    if (oldStatus === "used_in" || oldStatus === "revoked") {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: `Cannot reissue pass in '${oldStatus}' state.` };
    }

    const casRes = await client.execute({
      sql: `
        UPDATE hostel_gate_passes 
        SET status = 'revoked', revoked_at = ?, revoked_staff_id = ?, revoke_reason = 'Reissued'
        WHERE id = ? AND institution_id = ? AND status IN ('issued', 'used_out');
      `,
      args: [issuedAt, staffId, oldPassId, institutionId]
    });

    const affected = Number(casRes.rowsAffected ?? 0);
    if (affected === 0) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "CAS concurrency conflict: pass status changed concurrently." };
    }

    await client.execute({
      sql: `
        INSERT INTO hostel_gate_passes (
          id, institution_id, leave_id, student_id, pass_number,
          token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?);
      `,
      args: [newPassId, institutionId, leaveId, studentId, newPassNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]
    });

    if (ownsSqliteTx) await client.execute("COMMIT;");
    return { success: true, passId: newPassId };
  } catch (err: any) {
    if (ownsSqliteTx) {
      try { await client.execute("ROLLBACK;"); } catch {}
    }
    return { success: false, error: err.message };
  }
}

export async function scanGatePass(
  client: any,
  params: ScanGatePassParams,
  options?: { isPostgres?: boolean }
): Promise<ScanGatePassResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const {
    institutionId, passId, rawQrSecret, direction,
    scannedAt, receivedAt, deviceId, guardStaffId,
    idempotencyKey, manualOverride, overrideReason
  } = params;

  const logId = `gatelog-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SET LOCAL lock_timeout = '5s';");
      await conn.query("SET LOCAL statement_timeout = '10s';");
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      let verificationResult = "verified";

      if (manualOverride) {
        verificationResult = "manual_override";
      } else if (!passId || !rawQrSecret || typeof rawQrSecret !== "string") {
        verificationResult = "tampered";
      } else {
        const passRes = await conn.query(`
          SELECT id, token_hash, valid_from, valid_until, status 
          FROM hostel_gate_passes 
          WHERE id = $1 AND institution_id = $2 FOR UPDATE;
        `, [passId, institutionId]);

        if (passRes.rows.length === 0) {
          verificationResult = "tampered";
        } else {
          const pass = passRes.rows[0];
          const expectedHash = hashQrSecret(rawQrSecret);

          if (pass.status === "revoked") {
            verificationResult = "revoked_rejected";
          } else if (pass.status === "used_in") {
            verificationResult = "tampered";
          } else if (direction === "out" && pass.status !== "issued") {
            verificationResult = "tampered";
          } else if (direction === "in" && pass.status !== "used_out" && !manualOverride) {
            verificationResult = "tampered";
          } else if (!safeTimingHashEqual(pass.token_hash, expectedHash)) {
            verificationResult = "tampered";
          } else {
            const scanTime = new Date(scannedAt).getTime();
            const fromTime = new Date(pass.valid_from).getTime();
            const untilTime = new Date(pass.valid_until).getTime();

            if (scanTime < fromTime) {
              verificationResult = "out_of_window_rejected";
            } else if (scanTime > untilTime) {
              verificationResult = "expired_rejected";
            }
          }
        }
      }

      await conn.query(`
        INSERT INTO hostel_gate_logs (
          id, institution_id, pass_id, direction, scanned_at, received_at,
          device_id, guard_staff_id, verification_result, override_reason, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [
        logId, institutionId, passId, direction, scannedAt, receivedAt,
        deviceId, guardStaffId, verificationResult, overrideReason || null, idempotencyKey
      ]);

      if (verificationResult === "verified" && passId) {
        const nextStatus = direction === "out" ? "used_out" : "used_in";
        const expectedStatus = direction === "out" ? "issued" : "used_out";
        const updateRes = await conn.query(`
          UPDATE hostel_gate_passes 
          SET status = $1 
          WHERE id = $2 AND institution_id = $3 AND status = $4;
        `, [nextStatus, passId, institutionId, expectedStatus]);

        const affected = updateRes.rowCount ?? updateRes.affectedRows ?? 0;
        if (affected === 0) {
          throw new Error("Pass already consumed or status changed concurrently.");
        }
      }

      await conn.query("COMMIT;");
      return {
        success: verificationResult === "verified" || verificationResult === "manual_override",
        logId,
        verificationResult: verificationResult as any
      };
    } catch (err: any) {
      if (ownsTx) {
        try { await conn.query("ROLLBACK;"); } catch {}
      }
      return { success: false, verificationResult: "tampered", error: err.message };
    } finally {
      release();
    }
  }

  // SQLite / LibSQL
  let ownsSqliteTx = false;
  try {
    if (typeof client.execute === "function") {
      try {
        await client.execute("BEGIN IMMEDIATE;");
        ownsSqliteTx = true;
      } catch {
        // Already in transaction
      }
    }

    let verificationResult = "verified";

    if (manualOverride) {
      verificationResult = "manual_override";
    } else if (!passId || !rawQrSecret || typeof rawQrSecret !== "string") {
      verificationResult = "tampered";
    } else {
      const passRes = await client.execute({
        sql: `SELECT id, token_hash, valid_from, valid_until, status FROM hostel_gate_passes WHERE id = ? AND institution_id = ?;`,
        args: [passId, institutionId]
      });

      if (passRes.rows.length === 0) {
        verificationResult = "tampered";
      } else {
        const pass = passRes.rows[0] as any;
        const expectedHash = hashQrSecret(rawQrSecret);

        if (pass.status === "revoked") {
          verificationResult = "revoked_rejected";
        } else if (pass.status === "used_in") {
          verificationResult = "tampered";
        } else if (direction === "out" && pass.status !== "issued") {
          verificationResult = "tampered";
        } else if (direction === "in" && pass.status !== "used_out" && !manualOverride) {
          verificationResult = "tampered";
        } else if (!safeTimingHashEqual(pass.token_hash, expectedHash)) {
          verificationResult = "tampered";
        } else {
          const scanTime = new Date(scannedAt).getTime();
          const fromTime = new Date(pass.valid_from).getTime();
          const untilTime = new Date(pass.valid_until).getTime();

          if (scanTime < fromTime) {
            verificationResult = "out_of_window_rejected";
          } else if (scanTime > untilTime) {
            verificationResult = "expired_rejected";
          }
        }
      }
    }

    await client.execute({
      sql: `
        INSERT INTO hostel_gate_logs (
          id, institution_id, pass_id, direction, scanned_at, received_at,
          device_id, guard_staff_id, verification_result, override_reason, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      args: [
        logId, institutionId, passId, direction, scannedAt, receivedAt,
        deviceId, guardStaffId, verificationResult, overrideReason || null, idempotencyKey
      ]
    });

    if (verificationResult === "verified" && passId) {
      const nextStatus = direction === "out" ? "used_out" : "used_in";
      const expectedStatus = direction === "out" ? "issued" : "used_out";
      const updateRes = await client.execute({
        sql: `UPDATE hostel_gate_passes SET status = ? WHERE id = ? AND institution_id = ? AND status = ?;`,
        args: [nextStatus, passId, institutionId, expectedStatus]
      });
      const affected = updateRes.rowsAffected ?? 0;
      if (affected === 0) {
        throw new Error("Pass already consumed or status changed concurrently.");
      }
    }

    if (ownsSqliteTx) await client.execute("COMMIT;");
    return {
      success: verificationResult === "verified" || verificationResult === "manual_override",
      logId,
      verificationResult: verificationResult as any
    };
  } catch (err: any) {
    if (ownsSqliteTx) {
      try { await client.execute("ROLLBACK;"); } catch {}
    }
    return { success: false, verificationResult: "tampered", error: err.message };
  }
}
