import {
  AllocateBedParams,
  AllocateBedResult,
  VacateBedParams,
  VacateBedResult
} from "./types";
import {
  BedCollisionError,
  StudentCollisionError,
  RoomCapacityExceededError,
  GenderParityViolationError,
  WardenUnauthorizedError,
  BedMaintenanceError,
  classifyAllocationViolation
} from "./errors";

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

export async function allocateHostelBed(
  client: any,
  params: AllocateBedParams,
  options?: { isPostgres?: boolean }
): Promise<AllocateBedResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const { institutionId, bedId, studentId, academicYearId, staffId } = params;
  const allocatedAt = params.allocatedAt || new Date().toISOString();

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      // 1. Bed, parent room, block existence & active status
      const bedRes = await conn.query(`
        SELECT b.id as bed_id, b.room_id, b.is_maintenance, r.block_id, r.capacity, bl.gender as block_gender
        FROM hostel_beds b
        JOIN hostel_rooms r ON r.id = b.room_id AND r.institution_id = b.institution_id
        JOIN hostel_blocks bl ON bl.id = r.block_id AND bl.institution_id = r.institution_id
        WHERE b.id = $1 AND b.institution_id = $2
          AND b.deleted_at IS NULL AND r.deleted_at IS NULL AND bl.deleted_at IS NULL;
      `, [bedId, institutionId]);

      if (bedRes.rows.length === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Bed or parent room/block does not exist or has been deleted." };
      }

      const bed = bedRes.rows[0];
      if (bed.is_maintenance) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Bed is currently under maintenance." };
      }

      // 1b. Active warden authorization for this block
      const wardenRes = await conn.query(`
        SELECT id FROM hostel_block_wardens 
        WHERE institution_id = $1 AND block_id = $2 AND staff_id = $3 AND revoked_at IS NULL;
      `, [institutionId, bed.block_id, staffId]);

      if (wardenRes.rows.length === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Staff member is not an active assigned warden for this block." };
      }

      // 2. Student existence and gender parity
      const studentRes = await conn.query(`
        SELECT id, gender FROM students WHERE id = $1 AND institution_id = $2;
      `, [studentId, institutionId]);

      if (studentRes.rows.length === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Student not found." };
      }

      const student = studentRes.rows[0];
      const expectedGender = bed.block_gender === "boys" ? "male" : "female";
      if (student.gender !== expectedGender) {
        await conn.query("ROLLBACK;");
        return {
          success: false,
          error: `Gender parity violation: student is ${student.gender} but block is ${bed.block_gender}.`
        };
      }

      // 3. Row lock on hostel_rooms via FOR UPDATE to prevent capacity race
      await conn.query(`
        SELECT id, capacity FROM hostel_rooms WHERE id = $1 AND institution_id = $2 FOR UPDATE;
      `, [bed.room_id, institutionId]);

      // Check active room occupancy
      const occRes = await conn.query(`
        SELECT count(*)::int as active_count
        FROM hostel_bed_allocations a
        JOIN hostel_beds b ON b.id = a.bed_id AND b.institution_id = a.institution_id
        WHERE b.room_id = $1 AND a.institution_id = $2 AND a.vacated_at IS NULL;
      `, [bed.room_id, institutionId]);

      if (occRes.rows[0].active_count >= bed.capacity) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Room is at full capacity." };
      }

      // 4. Insert allocation
      const allocId = `alloc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await conn.query(`
        INSERT INTO hostel_bed_allocations (
          id, institution_id, bed_id, student_id, academic_year_id,
          allocated_at, vacated_at, allocated_staff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7);
      `, [allocId, institutionId, bedId, studentId, academicYearId, allocatedAt, staffId]);

      await conn.query("COMMIT;");
      return { success: true, allocationId: allocId };
    } catch (err: any) {
      if (ownsTx) {
        try { await conn.query("ROLLBACK;"); } catch {}
      }
      const violation = classifyAllocationViolation(err);
      return {
        success: false,
        error: err.message,
        collisionType: violation.type
      };
    } finally {
      release();
    }
  }

  // SQLite / LibSQL execution path
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

    const bedRes = await client.execute({
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
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Bed or parent room/block does not exist or has been deleted." };
    }

    const bed = bedRes.rows[0] as any;
    if (Boolean(bed.is_maintenance)) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Bed is currently under maintenance." };
    }

    // Check active warden authorization
    const wardenRes = await client.execute({
      sql: `
        SELECT id FROM hostel_block_wardens 
        WHERE institution_id = ? AND block_id = ? AND staff_id = ? AND revoked_at IS NULL;
      `,
      args: [institutionId, bed.block_id, staffId],
    });

    if (wardenRes.rows.length === 0) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Staff member is not an active assigned warden for this block." };
    }

    // Check student existence & gender parity
    const studentRes = await client.execute({
      sql: `SELECT id, gender FROM students WHERE id = ? AND institution_id = ?;`,
      args: [studentId, institutionId],
    });

    if (studentRes.rows.length === 0) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Student not found." };
    }

    const student = studentRes.rows[0] as any;
    const expectedGender = bed.block_gender === "boys" ? "male" : "female";
    if (student.gender !== expectedGender) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return {
        success: false,
        error: `Gender parity violation: student is ${student.gender} but block is ${bed.block_gender}.`
      };
    }

    // Check active room occupancy
    const occRes = await client.execute({
      sql: `
        SELECT count(*) as active_count
        FROM hostel_bed_allocations a
        JOIN hostel_beds b ON b.id = a.bed_id AND b.institution_id = a.institution_id
        WHERE b.room_id = ? AND a.institution_id = ? AND a.vacated_at IS NULL;
      `,
      args: [bed.room_id, institutionId]
    });

    const activeCount = Number((occRes.rows[0] as any).active_count || 0);
    if (activeCount >= Number(bed.capacity)) {
      if (ownsSqliteTx) await client.execute("ROLLBACK;");
      return { success: false, error: "Room is at full capacity." };
    }

    const allocId = `alloc-sqlite-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await client.execute({
      sql: `
        INSERT INTO hostel_bed_allocations (
          id, institution_id, bed_id, student_id, academic_year_id,
          allocated_at, vacated_at, allocated_staff_id
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?);
      `,
      args: [allocId, institutionId, bedId, studentId, academicYearId, allocatedAt, staffId]
    });

    if (ownsSqliteTx) await client.execute("COMMIT;");
    return { success: true, allocationId: allocId };
  } catch (innerErr: any) {
    if (ownsSqliteTx) {
      try { await client.execute("ROLLBACK;"); } catch {}
    }
    const violation = classifyAllocationViolation(innerErr);
    return {
      success: false,
      error: innerErr.message,
      collisionType: violation.type
    };
  }
}

export async function vacateHostelBed(
  client: any,
  params: VacateBedParams,
  options?: { isPostgres?: boolean }
): Promise<VacateBedResult> {
  const isPostgres = options?.isPostgres ?? isPostgresConnection(client);
  const { institutionId, allocationId } = params;
  const vacatedAt = params.vacatedAt || new Date().toISOString();

  if (isPostgres) {
    const { conn, release } = await acquirePgClient(client);
    let ownsTx = false;
    try {
      await conn.query("BEGIN;");
      ownsTx = true;
      await conn.query("SELECT set_config('app.current_tenant_id', $1, true);", [institutionId]);

      const res = await conn.query(`
        UPDATE hostel_bed_allocations 
        SET vacated_at = $1 
        WHERE id = $2 AND institution_id = $3 AND vacated_at IS NULL;
      `, [vacatedAt, allocationId, institutionId]);

      const affected = res.rowCount ?? (res as any).affectedRows ?? 0;
      if (affected === 0) {
        await conn.query("ROLLBACK;");
        return { success: false, error: "Active bed allocation not found or already vacated." };
      }

      await conn.query("COMMIT;");
      return { success: true };
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
    const res = await client.execute({
      sql: `
        UPDATE hostel_bed_allocations 
        SET vacated_at = ? 
        WHERE id = ? AND institution_id = ? AND vacated_at IS NULL;
      `,
      args: [vacatedAt, allocationId, institutionId]
    });

    if (res.rowsAffected === 0) {
      return { success: false, error: "Active bed allocation not found or already vacated." };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
