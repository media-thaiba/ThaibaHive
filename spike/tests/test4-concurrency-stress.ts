import pg from "pg";
import { validateSpikeDatabaseUrl } from "../src/guard.js";
import { classifyAllocationViolation } from "../src/errors.js";
import { allocateHostelBed, reissueGatePass } from "../src/service.js";

const { Pool } = pg;

export async function runTest4(appDbUrl: string): Promise<{
  bedIterationsPassed: number;
  studentIterationsPassed: number;
  casReissueIterationsPassed: number;
  capacityLockedPassed: boolean;
  negativeControlDetectedRace: boolean;
}> {
  validateSpikeDatabaseUrl(appDbUrl);

  // Production-mirrored Pool (matches packages/db/index.ts: max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000)
  const pool = new Pool({
    connectionString: appDbUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  let bedIterationsPassed = 0;
  let studentIterationsPassed = 0;
  let casReissueIterationsPassed = 0;

  try {
    // Pre-seed parent block, room, staff, and academic year for test tenant
    const initClient = await pool.connect();
    try {
      await initClient.query(`
        BEGIN;
        SELECT set_config('app.current_tenant_id', 'inst-a', true);
        INSERT INTO hostel_blocks (id, institution_id, name, gender) 
        VALUES ('block-a', 'inst-a', 'Block A', 'boys') ON CONFLICT DO NOTHING;
        INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity)
        VALUES ('room-a1', 'inst-a', 'block-a', '101', 500) 
        ON CONFLICT (id) DO UPDATE SET capacity = 500;
        INSERT INTO staff (id, email, full_name)
        VALUES ('staff-warden-1', 'warden@inst-a.edu', 'Warden One') ON CONFLICT DO NOTHING;
        INSERT INTO staff_institutions (institution_id, staff_id, role)
        VALUES ('inst-a', 'staff-warden-1', 'warden') ON CONFLICT DO NOTHING;
        INSERT INTO academic_years (id, institution_id, name, is_current)
        VALUES ('ay-2026', 'inst-a', '2026-2027', 'true') ON CONFLICT DO NOTHING;
        INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at)
        VALUES ('warden-assign-1', 'inst-a', 'block-a', 'staff-warden-1', '2026-10-25T00:00:00.000Z')
        ON CONFLICT DO NOTHING;
        COMMIT;
      `);
    } finally {
      initClient.release();
    }

    // 1. Concurrent Bed Allocation Stress Test using service layer (50 iterations)
    for (let i = 0; i < 50; i++) {
      const seedClient = await pool.connect();
      const bedId = `stress-bed-${i}-${Date.now()}`;
      const student1 = `student-a-${i}-${Date.now()}`;
      const student2 = `student-b-${i}-${Date.now()}`;

      try {
        await seedClient.query(`
          BEGIN;
          SELECT set_config('app.current_tenant_id', 'inst-a', true);
          INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance)
          VALUES ('${bedId}', 'inst-a', 'room-a1', 'B${i}', false) ON CONFLICT DO NOTHING;
          INSERT INTO students (id, institution_id, admission_number, full_name, gender)
          VALUES 
            ('${student1}', 'inst-a', 'ADM-A-${i}-${Date.now()}', 'Student 1', 'male'),
            ('${student2}', 'inst-a', 'ADM-B-${i}-${Date.now()}', 'Student 2', 'male');
          COMMIT;
        `);
      } finally {
        seedClient.release();
      }

      // Race both allocations simultaneously using allocateHostelBed service
      const runAlloc = async (sId: string) => {
        const client = await pool.connect();
        try {
          return await allocateHostelBed(client, {
            institutionId: "inst-a",
            bedId,
            studentId: sId,
            academicYearId: "ay-2026",
            staffId: "staff-warden-1",
            allocatedAt: "2026-10-25T00:00:00.000Z",
          });
        } finally {
          client.release();
        }
      };

      const [r1, r2] = await Promise.all([runAlloc(student1), runAlloc(student2)]);

      const exactlyOneSuccess = (r1.success && !r2.success) || (!r1.success && r2.success);
      const failedResult = r1.success ? r2 : r1;
      const classifiedAsBed = failedResult.collisionType === "bed_collision";

      if (exactlyOneSuccess && classifiedAsBed) {
        bedIterationsPassed++;
      }
    }

    // 2. Concurrent Student Double-Allocation Test using service layer (50 iterations)
    for (let i = 0; i < 50; i++) {
      const seedClient = await pool.connect();
      const studentId = `student-shared-${i}-${Date.now()}`;
      const bedA = `bed-opt-a-${i}-${Date.now()}`;
      const bedB = `bed-opt-b-${i}-${Date.now()}`;

      try {
        await seedClient.query(`
          BEGIN;
          SELECT set_config('app.current_tenant_id', 'inst-a', true);
          INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance)
          VALUES 
            ('${bedA}', 'inst-a', 'room-a1', 'BA${i}', false),
            ('${bedB}', 'inst-a', 'room-a1', 'BB${i}', false)
          ON CONFLICT DO NOTHING;
          INSERT INTO students (id, institution_id, admission_number, full_name, gender)
          VALUES ('${studentId}', 'inst-a', 'ADM-S-${i}-${Date.now()}', 'Student S', 'male');
          COMMIT;
        `);
      } finally {
        seedClient.release();
      }

      const runStudentAlloc = async (bId: string) => {
        const client = await pool.connect();
        try {
          return await allocateHostelBed(client, {
            institutionId: "inst-a",
            bedId: bId,
            studentId,
            academicYearId: "ay-2026",
            staffId: "staff-warden-1",
            allocatedAt: "2026-10-25T00:00:00.000Z",
          });
        } finally {
          client.release();
        }
      };

      const [r1, r2] = await Promise.all([runStudentAlloc(bedA), runStudentAlloc(bedB)]);

      const exactlyOneSuccess = (r1.success && !r2.success) || (!r1.success && r2.success);
      const failedResult = r1.success ? r2 : r1;
      const classifiedAsStudent = failedResult.collisionType === "student_collision";

      if (exactlyOneSuccess && classifiedAsStudent) {
        studentIterationsPassed++;
      }
    }

    // 3. Concurrent CAS Gate Pass Reissue Race (10 iterations)
    for (let i = 0; i < 10; i++) {
      const seedClient = await pool.connect();
      const leaveId = `leave-cas-${i}-${Date.now()}`;
      const passId = `pass-cas-${i}-${Date.now()}`;
      const studentId = `student-cas-${i}-${Date.now()}`;

      try {
        await seedClient.query(`
          BEGIN;
          SELECT set_config('app.current_tenant_id', 'inst-a', true);
          INSERT INTO students (id, institution_id, admission_number, full_name, gender)
          VALUES ('${studentId}', 'inst-a', 'ADM-CAS-${i}-${Date.now()}', 'CAS Student', 'male');
          INSERT INTO hostel_leaves (
            id, institution_id, student_id, leave_type, status,
            expected_out_at, expected_in_at, authorized_pickup_name, authorized_pickup_phone,
            parent_consent_received, created_at
          ) VALUES (
            '${leaveId}', 'inst-a', '${studentId}', 'home', 'approved',
            '2026-10-25T08:00:00.000Z', '2026-10-25T18:00:00.000Z', 'Parent One', '+919876543210',
            true, '2026-10-25T00:00:00.000Z'
          );
          INSERT INTO hostel_gate_passes (
            id, institution_id, leave_id, student_id, pass_number,
            token_hash, valid_from, valid_until, status, issued_staff_id, issued_at
          ) VALUES (
            '${passId}', 'inst-a', '${leaveId}', '${studentId}', 'GP-CAS-${i}-${Date.now()}',
            'initial_hash_${i}_${Date.now()}', '2026-10-25T08:00:00.000Z', '2026-10-25T18:00:00.000Z',
            'issued', 'staff-warden-1', '2026-10-25T07:30:00.000Z'
          );
          COMMIT;
        `);
      } finally {
        seedClient.release();
      }

      // Race 2 simultaneous reissueGatePass calls on the same old pass
      const runReissue = async (callIdx: number) => {
        const client = await pool.connect();
        try {
          return await reissueGatePass(client, {
            institutionId: "inst-a",
            leaveId,
            studentId,
            oldPassId: passId,
            staffId: "staff-warden-1",
            newPassNumber: `GP-REISSUE-${i}-${callIdx}`,
            rawQrSecret: `secret-reissue-${i}-${callIdx}-${Date.now()}`,
            validFrom: "2026-10-25T08:00:00.000Z",
            validUntil: "2026-10-25T18:00:00.000Z",
            issuedAt: "2026-10-25T08:30:00.000Z",
          });
        } finally {
          client.release();
        }
      };

      const [p1, p2] = await Promise.all([runReissue(1), runReissue(2)]);

      const exactlyOneCasSuccess = (p1.success && !p2.success) || (!p1.success && p2.success);
      const failedCas = p1.success ? p2 : p1;
      const casConflictDetected = failedCas.error?.includes("CAS concurrency conflict");

      if (exactlyOneCasSuccess && casConflictDetected) {
        casReissueIterationsPassed++;
      }
    }

    // 4. Room Capacity Race with Lock vs Negative Control
    // Setup room with capacity = 2, 1 already allocated
    const setupClient = await pool.connect();
    const capRoomId = `room-cap-${Date.now()}`;
    const sExist = `s-exist-${Date.now()}`;
    const sCap1 = `s-cap-1-${Date.now()}`;
    const sCap2 = `s-cap-2-${Date.now()}`;
    const sCap3 = `s-cap-3-${Date.now()}`;

    try {
      await setupClient.query(`
        BEGIN;
        SELECT set_config('app.current_tenant_id', 'inst-a', true);
        INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity)
        VALUES ('${capRoomId}', 'inst-a', 'block-a', 'R-CAP', 2);
        INSERT INTO hostel_beds (id, institution_id, room_id, bed_number) VALUES
          ('${capRoomId}-b1', 'inst-a', '${capRoomId}', 'B1'),
          ('${capRoomId}-b2', 'inst-a', '${capRoomId}', 'B2'),
          ('${capRoomId}-b3', 'inst-a', '${capRoomId}', 'B3'),
          ('${capRoomId}-b4', 'inst-a', '${capRoomId}', 'B4');
        INSERT INTO students (id, institution_id, admission_number, full_name, gender) VALUES
          ('${sExist}', 'inst-a', 'ADM-E-${Date.now()}', 'Existing Student', 'male');
        INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id)
        VALUES (gen_random_uuid(), 'inst-a', '${capRoomId}-b1', '${sExist}', 'ay-2026', '2026-10-25T00:00:00.000Z', 'staff-warden-1');
        COMMIT;
      `);
    } finally {
      setupClient.release();
    }

    // (a) Locked Allocation (SELECT ... FOR UPDATE on room)
    const runLockedAlloc = async (bId: string, sId: string) => {
      const cl = await pool.connect();
      try {
        await cl.query("BEGIN;");
        await cl.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
        // Acquire exclusive lock on the room
        const roomRes = await cl.query(`SELECT capacity FROM hostel_rooms WHERE id = '${capRoomId}' FOR UPDATE;`);
        const capacity = roomRes.rows[0].capacity;
        const countRes = await cl.query(`
          SELECT count(*)::int as active_count 
          FROM hostel_bed_allocations a
          JOIN hostel_beds b ON b.id = a.bed_id
          WHERE b.room_id = '${capRoomId}' AND a.vacated_at IS NULL;
        `);
        if (countRes.rows[0].active_count >= capacity) {
          throw new Error("Room capacity reached");
        }
        await cl.query(`
          INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id)
          VALUES (gen_random_uuid(), 'inst-a', '${bId}', '${sId}', 'ay-2026', '2026-10-25T00:00:00.000Z', 'staff-warden-1');
        `);
        await cl.query("COMMIT;");
        return true;
      } catch {
        await cl.query("ROLLBACK;");
        return false;
      } finally {
        cl.release();
      }
    };

    // Seed 3 new students for the locked test
    const seedLockClient = await pool.connect();
    try {
      await seedLockClient.query(`
        BEGIN;
        SELECT set_config('app.current_tenant_id', 'inst-a', true);
        INSERT INTO students (id, institution_id, admission_number, full_name, gender) VALUES
          ('${sCap1}', 'inst-a', 'ADM-C1-${Date.now()}', 'Candidate 1', 'male'),
          ('${sCap2}', 'inst-a', 'ADM-C2-${Date.now()}', 'Candidate 2', 'male'),
          ('${sCap3}', 'inst-a', 'ADM-C3-${Date.now()}', 'Candidate 3', 'male');
        COMMIT;
      `);
    } finally {
      seedLockClient.release();
    }

    // Run 3 concurrent allocations when capacity remaining is 1 (capacity=2, 1 existing)
    const lockedResults = await Promise.all([
      runLockedAlloc(`${capRoomId}-b2`, sCap1),
      runLockedAlloc(`${capRoomId}-b3`, sCap2),
      runLockedAlloc(`${capRoomId}-b4`, sCap3),
    ]);

    const lockedSuccessCount = lockedResults.filter(Boolean).length;
    const capacityLockedPassed = lockedSuccessCount === 1; // Exactly 1 succeeds, reaching capacity=2

    // (b) Negative Control: Run unlocked allocation concurrently
    // Setup another room with capacity=1, 0 allocated
    const unlClient = await pool.connect();
    const unlRoomId = `room-unl-${Date.now()}`;
    const sUnl1 = `s-unl-1-${Date.now()}`;
    const sUnl2 = `s-unl-2-${Date.now()}`;

    try {
      await unlClient.query(`
        BEGIN;
        SELECT set_config('app.current_tenant_id', 'inst-a', true);
        INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity)
        VALUES ('${unlRoomId}', 'inst-a', 'block-a', 'R-UNL', 1);
        INSERT INTO hostel_beds (id, institution_id, room_id, bed_number) VALUES
          ('${unlRoomId}-b1', 'inst-a', '${unlRoomId}', 'B1'),
          ('${unlRoomId}-b2', 'inst-a', '${unlRoomId}', 'B2');
        INSERT INTO students (id, institution_id, admission_number, full_name, gender) VALUES
          ('${sUnl1}', 'inst-a', 'ADM-U1-${Date.now()}', 'Unl 1', 'male'),
          ('${sUnl2}', 'inst-a', 'ADM-U2-${Date.now()}', 'Unl 2', 'male');
        COMMIT;
      `);
    } finally {
      unlClient.release();
    }

    const runUnlockedAlloc = async (bId: string, sId: string) => {
      const cl = await pool.connect();
      try {
        await cl.query("BEGIN;");
        await cl.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
        // Read without lock
        const countRes = await cl.query(`
          SELECT count(*)::int as active_count 
          FROM hostel_bed_allocations a
          JOIN hostel_beds b ON b.id = a.bed_id
          WHERE b.room_id = '${unlRoomId}' AND a.vacated_at IS NULL;
        `);
        // Simulate slight delay before insert to trigger race
        await new Promise((r) => setTimeout(r, 20));
        if (countRes.rows[0].active_count >= 1) {
          throw new Error("Capacity exceeded");
        }
        await cl.query(`
          INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id)
          VALUES (gen_random_uuid(), 'inst-a', '${bId}', '${sId}', 'ay-2026', '2026-10-25T00:00:00.000Z', 'staff-warden-1');
        `);
        await cl.query("COMMIT;");
        return true;
      } catch {
        await cl.query("ROLLBACK;");
        return false;
      } finally {
        cl.release();
      }
    };

    const unlockedResults = await Promise.all([
      runUnlockedAlloc(`${unlRoomId}-b1`, sUnl1),
      runUnlockedAlloc(`${unlRoomId}-b2`, sUnl2),
    ]);

    // If unlocked, both read count=0 simultaneously and both insert -> 2 successes exceeding capacity 1!
    const negativeControlDetectedRace = unlockedResults.filter(Boolean).length > 1;

    return {
      bedIterationsPassed,
      studentIterationsPassed,
      casReissueIterationsPassed,
      capacityLockedPassed,
      negativeControlDetectedRace,
    };
  } finally {
    await pool.end();
  }
}
