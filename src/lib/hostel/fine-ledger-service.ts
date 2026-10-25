import crypto from "crypto";
import {
  AssessFineParams,
  WaiveFineParams,
  FineActionResult
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

function canonicalHash(data: Record<string, any>): string {
  const sortedKeys = Object.keys(data).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = data[k];
  }
  return crypto.createHash("sha256").update(JSON.stringify(sortedObj)).digest("hex");
}

export async function assessFine(
  client: any,
  params: AssessFineParams,
  options?: { isPostgres?: boolean }
): Promise<FineActionResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const {
    institutionId, studentId, leaveId, fineCategory, daysLate = 0,
    ratePerDayMinor = 0, totalAmountMinor, actorType, actorStaffId,
    idempotencyKey, createdAt
  } = params;

  const fineId = `fine-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const actionId = `fact-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payloadHash = canonicalHash({
    fineId,
    institutionId,
    studentId,
    totalAmountMinor,
    fineCategory,
    actionType: "ASSESSED",
    actorType,
    actorStaffId: actorStaffId || null
  });

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Insert parent fine
      await conn.query(`
        INSERT INTO hostel_fines (
          id, institution_id, student_id, leave_id, fine_category,
          days_late, rate_per_day, total_amount, paid_amount, status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'assessed', $9, $10);
      `, [
        fineId, institutionId, studentId, leaveId || null, fineCategory,
        daysLate, ratePerDayMinor, totalAmountMinor, createdAt, createdAt
      ]);

      // 2. Insert append-only action ledger entry
      await conn.query(`
        INSERT INTO hostel_fine_actions (
          id, institution_id, fine_id, action_type, amount,
          idempotency_key, payload_hash, actor_type, actor_staff_id, created_at
        ) VALUES ($1, $2, $3, 'ASSESSED', $4, $5, $6, $7, $8, $9);
      `, [
        actionId, institutionId, fineId, totalAmountMinor,
        idempotencyKey, payloadHash, actorType, actorStaffId || null, createdAt
      ]);

      await conn.query("COMMIT;");
      return { success: true, fineId, actionId };
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
        // Already inside an active transaction
      }
    }

    try {
      await client.execute({
        sql: `
          INSERT INTO hostel_fines (
            id, institution_id, student_id, leave_id, fine_category,
            days_late, rate_per_day, total_amount, paid_amount, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'assessed', ?, ?);
        `,
        args: [
          fineId, institutionId, studentId, leaveId || null, fineCategory,
          daysLate, ratePerDayMinor, totalAmountMinor, createdAt, createdAt
        ]
      });

      await client.execute({
        sql: `
          INSERT INTO hostel_fine_actions (
            id, institution_id, fine_id, action_type, amount,
            idempotency_key, payload_hash, actor_type, actor_staff_id, created_at
          ) VALUES (?, ?, ?, 'ASSESSED', ?, ?, ?, ?, ?, ?);
        `,
        args: [
          actionId, institutionId, fineId, totalAmountMinor,
          idempotencyKey, payloadHash, actorType, actorStaffId || null, createdAt
        ]
      });

      if (ownsSqliteTx) await client.execute("COMMIT;");
      return { success: true, fineId, actionId };
    } catch (innerErr: any) {
      if (ownsSqliteTx) {
        try { await client.execute("ROLLBACK;"); } catch {}
      }
      return { success: false, error: innerErr.message };
    }
  } catch (err: any) {
    if (ownsSqliteTx) {
      try { await client.execute("ROLLBACK;"); } catch {}
    }
    return { success: false, error: err.message };
  }
}

export async function waiveFine(
  client: any,
  params: WaiveFineParams,
  options?: { isPostgres?: boolean }
): Promise<FineActionResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const {
    institutionId, fineId, waiveAmountMinor, actorStaffId,
    reason, idempotencyKey, createdAt
  } = params;

  const actionId = `fact-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payloadHash = canonicalHash({
    fineId,
    institutionId,
    waiveAmountMinor,
    reason,
    actionType: "WAIVED",
    actorType: "staff",
    actorStaffId
  });

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Fetch fine existence check
      const fineRes = await conn.query(`
        SELECT id, total_amount, paid_amount, status FROM hostel_fines 
        WHERE id = $1 AND institution_id = $2;
      `, [fineId, institutionId]);

      if (fineRes.rows.length === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Fine not found." };
      }

      const fine = fineRes.rows[0];
      if (fine.status === "waived" || fine.status === "paid") {
        await conn.query("ROLLBACK;");
        return { success: false, error: `Cannot waive fine with status '${fine.status}'.` };
      }

      // 2. CAS update fine status
      const updateRes = await conn.query(`
        UPDATE hostel_fines 
        SET status = 'waived', updated_at = $1 
        WHERE id = $2 AND institution_id = $3 AND status NOT IN ('waived', 'paid');
      `, [createdAt, fineId, institutionId]);

      const affected = updateRes.rowCount ?? (updateRes as any).affectedRows ?? 0;
      if (affected === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Fine cannot be waived (already paid, waived, or not found)." };
      }

      // 3. Append to immutable ledger
      await conn.query(`
        INSERT INTO hostel_fine_actions (
          id, institution_id, fine_id, action_type, amount,
          idempotency_key, payload_hash, actor_type, actor_staff_id, created_at
        ) VALUES ($1, $2, $3, 'WAIVED', $4, $5, $6, 'staff', $7, $8);
      `, [
        actionId, institutionId, fineId, waiveAmountMinor,
        idempotencyKey, payloadHash, actorStaffId, createdAt
      ]);

      await conn.query("COMMIT;");
      return { success: true, fineId, actionId };
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
        // Already inside an active transaction
      }
    }

    try {
      const fineRes = await client.execute({
        sql: `SELECT id, total_amount, paid_amount, status FROM hostel_fines WHERE id = ? AND institution_id = ?;`,
        args: [fineId, institutionId]
      });

      if (fineRes.rows.length === 0) {
        if (ownsSqliteTx) await client.execute("ROLLBACK;");
        return { success: false, error: "Fine not found." };
      }

      const fine = fineRes.rows[0] as any;
      if (fine.status === "waived" || fine.status === "paid") {
        if (ownsSqliteTx) await client.execute("ROLLBACK;");
        return { success: false, error: `Cannot waive fine with status '${fine.status}'.` };
      }

      const updateRes = await client.execute({
        sql: `UPDATE hostel_fines SET status = 'waived', updated_at = ? WHERE id = ? AND institution_id = ? AND status NOT IN ('waived', 'paid');`,
        args: [createdAt, fineId, institutionId]
      });

      if (Number(updateRes.rowsAffected ?? 0) === 0) {
        if (ownsSqliteTx) await client.execute("ROLLBACK;");
        return { success: false, error: "Fine cannot be waived (already paid, waived, or not found)." };
      }

      await client.execute({
        sql: `
          INSERT INTO hostel_fine_actions (
            id, institution_id, fine_id, action_type, amount,
            idempotency_key, payload_hash, actor_type, actor_staff_id, created_at
          ) VALUES (?, ?, ?, 'WAIVED', ?, ?, ?, 'staff', ?, ?);
        `,
        args: [
          actionId, institutionId, fineId, waiveAmountMinor,
          idempotencyKey, payloadHash, actorStaffId, createdAt
        ]
      });

      if (ownsSqliteTx) await client.execute("COMMIT;");
      return { success: true, fineId, actionId };
    } catch (innerErr: any) {
      if (ownsSqliteTx) {
        try { await client.execute("ROLLBACK;"); } catch {}
      }
      return { success: false, error: innerErr.message };
    }
  } catch (err: any) {
    if (ownsSqliteTx) {
      try { await client.execute("ROLLBACK;"); } catch {}
    }
    return { success: false, error: err.message };
  }
}
