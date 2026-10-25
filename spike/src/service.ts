import crypto from "crypto";
import { sql } from "drizzle-orm";
import { classifyAllocationViolation } from "./errors.js";

export interface AllocateBedParams {
  institutionId: string;
  bedId: string;
  studentId: string;
  academicYearId: string;
  staffId: string;
  allocatedAt: string;
}

export interface ReissuePassParams {
  institutionId: string;
  leaveId: string;
  studentId: string;
  oldPassId: string;
  staffId: string;
  newPassNumber: string;
  rawQrSecret: string;
  validFrom: string;
  validUntil: string;
  issuedAt: string;
}

/**
 * Service function: allocateHostelBed
 * Enforces deleted-row checks, warden authorization, gender parity,
 * room capacity lock via FOR UPDATE, and classifies concurrency collisions.
 */
export async function allocateHostelBed(
  client: any,
  params: AllocateBedParams,
  options: { isPostgres: boolean } = { isPostgres: true }
): Promise<{ success: boolean; allocationId?: string; error?: string; collisionType?: string }> {
  const { institutionId, bedId, studentId, academicYearId, staffId, allocatedAt } = params;

  try {
    if (options.isPostgres) {
      await client.query("BEGIN;");
      await client.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Check bed and parent room existence & active status
      const bedRes = await client.query(`
        SELECT b.id as bed_id, b.room_id, b.is_maintenance, r.block_id, r.capacity, bl.gender as block_gender
        FROM hostel_beds b
        JOIN hostel_rooms r ON r.id = b.room_id AND r.institution_id = b.institution_id
        JOIN hostel_blocks bl ON bl.id = r.block_id AND bl.institution_id = r.institution_id
        WHERE b.id = $1 AND b.institution_id = $2
          AND b.deleted_at IS NULL AND r.deleted_at IS NULL AND bl.deleted_at IS NULL;
      `, [bedId, institutionId]);

      if (bedRes.rows.length === 0) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Bed or parent room/block does not exist or has been deleted." };
      }

      const bed = bedRes.rows[0];
      if (bed.is_maintenance) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Bed is currently under maintenance." };
      }

      // 1b. Check active warden authorization for this block
      const wardenRes = await client.query(`
        SELECT id FROM hostel_block_wardens 
        WHERE institution_id = $1 AND block_id = $2 AND staff_id = $3 AND revoked_at IS NULL;
      `, [institutionId, bed.block_id, staffId]);

      if (wardenRes.rows.length === 0) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Staff member is not an active assigned warden for this block." };
      }

      // 2. Check student gender parity
      const studentRes = await client.query(`
        SELECT id, gender FROM students WHERE id = $1 AND institution_id = $2;
      `, [studentId, institutionId]);

      if (studentRes.rows.length === 0) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Student not found." };
      }

      const student = studentRes.rows[0];
      const expectedGender = bed.block_gender === "boys" ? "male" : "female";
      if (student.gender !== expectedGender) {
        await client.query("ROLLBACK;");
        return { success: false, error: `Gender parity violation: student is ${student.gender} but block is ${bed.block_gender}.` };
      }

      // 3. Acquire Room Lock with FOR UPDATE to prevent capacity races
      await client.query(`
        SELECT id, capacity FROM hostel_rooms WHERE id = $1 AND institution_id = $2 FOR UPDATE;
      `, [bed.room_id, institutionId]);

      // Check current active room occupancy
      const occRes = await client.query(`
        SELECT count(*)::int as active_count
        FROM hostel_bed_allocations a
        JOIN hostel_beds b ON b.id = a.bed_id AND b.institution_id = a.institution_id
        WHERE b.room_id = $1 AND a.institution_id = $2 AND a.vacated_at IS NULL;
      `, [bed.room_id, institutionId]);

      if (occRes.rows[0].active_count >= bed.capacity) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Room is at full capacity." };
      }

      // 4. Insert allocation
      const allocId = `alloc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await client.query(`
        INSERT INTO hostel_bed_allocations (
          id, institution_id, bed_id, student_id, academic_year_id,
          allocated_at, vacated_at, allocated_staff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7);
      `, [allocId, institutionId, bedId, studentId, academicYearId, allocatedAt, staffId]);

      await client.query("COMMIT;");
      return { success: true, allocationId: allocId };
    } else {
      // LibSQL SQLite path: execute in transaction
      const tx = await client.transaction("write");
      try {
        const bedRes = await tx.execute({
          sql: `
            SELECT b.id as bed_id, b.room_id, b.is_maintenance, r.block_id, r.capacity, bl.gender as block_gender
            FROM hostel_beds b
            JOIN hostel_rooms r ON r.id = b.room_id AND r.institution_id = b.institution_id
            JOIN hostel_blocks bl ON bl.id = r.block_id AND bl.institution_id = r.institution_id
            WHERE b.id = ? AND b.institution_id = ?
              AND b.deleted_at IS NULL AND r.deleted_at IS NULL AND bl.deleted_at IS NULL;
          `,
          args: [bedId, institutionId]
        });

        if (bedRes.rows.length === 0) {
          await tx.rollback();
          return { success: false, error: "Bed or parent room/block does not exist or has been deleted." };
        }

        const bed = bedRes.rows[0] as any;
        if (Boolean(bed.is_maintenance)) {
          await tx.rollback();
          return { success: false, error: "Bed is currently under maintenance." };
        }

        // Check active warden authorization
        const wardenRes = await tx.execute({
          sql: `
            SELECT id FROM hostel_block_wardens 
            WHERE institution_id = ? AND block_id = ? AND staff_id = ? AND revoked_at IS NULL;
          `,
          args: [institutionId, bed.block_id, staffId],
        });
        if (wardenRes.rows.length === 0) {
          await tx.rollback();
          return { success: false, error: "Staff member is not an active assigned warden for this block." };
        }

        // Check student existence & gender parity
        const studentRes = await tx.execute({
          sql: `SELECT id, gender FROM students WHERE id = ? AND institution_id = ?;`,
          args: [studentId, institutionId],
        });
        if (studentRes.rows.length === 0) {
          await tx.rollback();
          return { success: false, error: "Student not found." };
        }
        const student = studentRes.rows[0] as any;
        const expectedGender = bed.block_gender === "boys" ? "male" : "female";
        if (student.gender !== expectedGender) {
          await tx.rollback();
          return { success: false, error: `Gender parity violation: student is ${student.gender} but block is ${bed.block_gender}.` };
        }

        const allocId = `alloc-sqlite-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await tx.execute({
          sql: `
            INSERT INTO hostel_bed_allocations (
              id, institution_id, bed_id, student_id, academic_year_id,
              allocated_at, vacated_at, allocated_staff_id
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?);
          `,
          args: [allocId, institutionId, bedId, studentId, academicYearId, allocatedAt, staffId]
        });

        await tx.commit();
        return { success: true, allocationId: allocId };
      } catch (err) {
        await tx.rollback();
        const classified = classifyAllocationViolation(err);
        return {
          success: false,
          error: String(err),
          collisionType: classified.type
        };
      }
    }
  } catch (err: any) {
    if (options.isPostgres) {
      try { await client.query("ROLLBACK;"); } catch {}
    }
    const classified = classifyAllocationViolation(err);
    return {
      success: false,
      error: err.message,
      collisionType: classified.type
    };
  }
}

/**
 * Service function: reissueGatePass
 * Compare-And-Swap (CAS) pattern: transitions old pass from issued/used_out to revoked,
 * and issues a new pass with a fresh SHA-256 token hash in the same transaction.
 */
export async function reissueGatePass(
  client: any,
  params: ReissuePassParams,
  options: { isPostgres: boolean } = { isPostgres: true }
): Promise<{ success: boolean; newPassId?: string; error?: string }> {
  const {
    institutionId, leaveId, studentId, oldPassId, staffId,
    newPassNumber, rawQrSecret, validFrom, validUntil, issuedAt
  } = params;

  const tokenHash = crypto.createHash("sha256").update(rawQrSecret).digest("hex");
  const newPassId = `pass-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  if (options.isPostgres) {
    try {
      await client.query("BEGIN;");
      await client.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Check existing pass status
      const oldRes = await client.query(`
        SELECT id, status FROM hostel_gate_passes WHERE id = $1 AND institution_id = $2;
      `, [oldPassId, institutionId]);

      if (oldRes.rows.length === 0) {
        await client.query("ROLLBACK;");
        return { success: false, error: "Old pass not found." };
      }

      const oldStatus = oldRes.rows[0].status;
      if (oldStatus === "used_in") {
        await client.query("ROLLBACK;");
        return { success: false, error: "Cannot reissue a pass for a student who has already checked in (used_in)." };
      }
      if (oldStatus === "revoked") {
        await client.query("ROLLBACK;");
        return { success: false, error: "Cannot reissue a pass that is already revoked." };
      }

      // 2. CAS revocation
      const casRes = await client.query(`
        UPDATE hostel_gate_passes 
        SET status = 'revoked', revoked_at = $1, revoked_staff_id = $2, revoke_reason = 'Reissued'
        WHERE id = $3 AND institution_id = $4 AND status IN ('issued', 'used_out');
      `, [issuedAt, staffId, oldPassId, institutionId]);

      if (casRes.rowCount === 0) {
        await client.query("ROLLBACK;");
        return { success: false, error: "CAS concurrency conflict: pass status changed concurrently." };
      }

      // 3. Insert new pass
      await client.query(`
        INSERT INTO hostel_gate_passes (
          id, institution_id, leave_id, student_id, pass_number,
          token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9, $10);
      `, [newPassId, institutionId, leaveId, studentId, newPassNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]);

      await client.query("COMMIT;");
      return { success: true, newPassId };
    } catch (err: any) {
      try { await client.query("ROLLBACK;"); } catch {}
      return { success: false, error: err.message };
    }
  } else {
    const tx = await client.transaction("write");
    try {
      const oldRes = await tx.execute({
        sql: `SELECT id, status FROM hostel_gate_passes WHERE id = ? AND institution_id = ?;`,
        args: [oldPassId, institutionId]
      });

      if (oldRes.rows.length === 0) {
        await tx.rollback();
        return { success: false, error: "Old pass not found." };
      }

      const oldStatus = (oldRes.rows[0] as any).status;
      if (oldStatus === "used_in" || oldStatus === "revoked") {
        await tx.rollback();
        return { success: false, error: `Cannot reissue pass in '${oldStatus}' state.` };
      }

      const casRes = await tx.execute({
        sql: `
          UPDATE hostel_gate_passes 
          SET status = 'revoked', revoked_at = ?, revoked_staff_id = ?, revoke_reason = 'Reissued'
          WHERE id = ? AND institution_id = ? AND status IN ('issued', 'used_out');
        `,
        args: [issuedAt, staffId, oldPassId, institutionId]
      });

      if (casRes.rowsAffected === 0) {
        await tx.rollback();
        return { success: false, error: "CAS concurrency conflict: pass status changed concurrently." };
      }

      await tx.execute({
        sql: `
          INSERT INTO hostel_gate_passes (
            id, institution_id, leave_id, student_id, pass_number,
            token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?);
        `,
        args: [newPassId, institutionId, leaveId, studentId, newPassNumber, tokenHash, validFrom, validUntil, staffId, issuedAt]
      });

      await tx.commit();
      return { success: true, newPassId };
    } catch (err: any) {
      await tx.rollback();
      return { success: false, error: err.message };
    }
  }
}
