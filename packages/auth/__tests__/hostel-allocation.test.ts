import { describe, it, expect, beforeEach } from "@jest/globals";
import { createClient } from "@libsql/client";
import {
  allocateHostelBed,
  vacateHostelBed
} from "@/lib/hostel";

describe("Hostel Bed Allocation & Occupancy Service (SQLite / LibSQL)", () => {
  let client: ReturnType<typeof createClient>;
  const instId = `inst_alloc_${Date.now()}`;
  const wardenStaffId = `stf_warden_${Date.now()}`;
  const unassignedStaffId = `stf_unassigned_${Date.now()}`;
  const revokedStaffId = `stf_revoked_${Date.now()}`;

  const maleStudentId = `stud_male_${Date.now()}`;
  const femaleStudentId = `stud_female_${Date.now()}`;
  const academicYearId = `ay_${Date.now()}`;

  const boysBlockId = `blk_boys_${Date.now()}`;
  const girlsBlockId = `blk_girls_${Date.now()}`;
  const deletedBlockId = `blk_del_${Date.now()}`;

  const roomBoysId = `rm_boys_${Date.now()}`;
  const bed1Id = `bed_b1_${Date.now()}`;
  const bed2Id = `bed_b2_${Date.now()}`;
  const bedMaintId = `bed_maint_${Date.now()}`;

  beforeEach(async () => {
    client = createClient({ url: ":memory:" });
    await client.execute("PRAGMA foreign_keys = ON;");

    // 1. Stubs
    await client.execute(`CREATE TABLE institutions (id TEXT PRIMARY KEY, name TEXT NOT NULL);`);
    await client.execute(`INSERT INTO institutions (id, name) VALUES ('${instId}', 'Test Campus');`);

    await client.execute(`
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        full_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        UNIQUE(institution_id, id)
      );
    `);
    await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${maleStudentId}', '${instId}', 'Male Student', 'male');`);
    await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${femaleStudentId}', '${instId}', 'Female Student', 'female');`);

    await client.execute(`
      CREATE TABLE staff_institutions (
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        staff_id TEXT NOT NULL,
        role TEXT NOT NULL,
        UNIQUE(institution_id, staff_id)
      );
    `);
    await client.execute(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', '${wardenStaffId}', 'warden');`);
    await client.execute(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', '${unassignedStaffId}', 'warden');`);
    await client.execute(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', '${revokedStaffId}', 'warden');`);

    await client.execute(`
      CREATE TABLE academic_years (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        name TEXT NOT NULL,
        UNIQUE(institution_id, id)
      );
    `);
    await client.execute(`INSERT INTO academic_years (id, institution_id, name) VALUES ('${academicYearId}', '${instId}', '2026-2027');`);

    // 2. Hostel Blocks, Wardens, Rooms, Beds, Allocations
    await client.execute(`
      CREATE TABLE hostel_blocks (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL REFERENCES institutions(id),
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        deleted_at TEXT,
        UNIQUE(institution_id, id)
      );
    `);
    await client.execute(`INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES ('${boysBlockId}', '${instId}', 'Boys Hostel A', 'boys');`);
    await client.execute(`INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES ('${girlsBlockId}', '${instId}', 'Girls Hostel B', 'girls');`);
    await client.execute(`INSERT INTO hostel_blocks (id, institution_id, name, gender, deleted_at) VALUES ('${deletedBlockId}', '${instId}', 'Old Block', 'boys', '2026-10-01T00:00:00.000Z');`);

    await client.execute(`
      CREATE TABLE hostel_block_wardens (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        block_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        revoked_at TEXT,
        FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id),
        FOREIGN KEY (institution_id, staff_id) REFERENCES staff_institutions(institution_id, staff_id)
      );
    `);
    await client.execute(`INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at) VALUES ('w1', '${instId}', '${boysBlockId}', '${wardenStaffId}', '2026-10-25T00:00:00.000Z');`);
    await client.execute(`INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at, revoked_at) VALUES ('w2', '${instId}', '${boysBlockId}', '${revokedStaffId}', '2026-10-01T00:00:00.000Z', '2026-10-15T00:00:00.000Z');`);

    await client.execute(`
      CREATE TABLE hostel_rooms (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        block_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        deleted_at TEXT,
        UNIQUE(institution_id, id),
        FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id)
      );
    `);
    // Room with capacity = 2
    await client.execute(`INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES ('${roomBoysId}', '${instId}', '${boysBlockId}', '101', 2);`);

    await client.execute(`
      CREATE TABLE hostel_beds (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        bed_number TEXT NOT NULL,
        is_maintenance INTEGER DEFAULT 0 NOT NULL,
        deleted_at TEXT,
        UNIQUE(institution_id, id),
        FOREIGN KEY (institution_id, room_id) REFERENCES hostel_rooms(institution_id, id)
      );
    `);
    await client.execute(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ('${bed1Id}', '${instId}', '${roomBoysId}', 'B1', 0);`);
    await client.execute(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ('${bed2Id}', '${instId}', '${roomBoysId}', 'B2', 0);`);
    await client.execute(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ('${bedMaintId}', '${instId}', '${roomBoysId}', 'BM', 1);`);

    await client.execute(`
      CREATE TABLE hostel_bed_allocations (
        id TEXT PRIMARY KEY NOT NULL,
        institution_id TEXT NOT NULL,
        bed_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        academic_year_id TEXT NOT NULL,
        allocated_at TEXT NOT NULL,
        vacated_at TEXT,
        allocated_staff_id TEXT NOT NULL,
        FOREIGN KEY (institution_id, bed_id) REFERENCES hostel_beds(institution_id, id),
        FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id),
        FOREIGN KEY (institution_id, academic_year_id) REFERENCES academic_years(institution_id, id),
        FOREIGN KEY (institution_id, allocated_staff_id) REFERENCES staff_institutions(institution_id, staff_id)
      );
    `);
    await client.execute(`CREATE UNIQUE INDEX idx_active_bed_allocation ON hostel_bed_allocations (institution_id, bed_id) WHERE vacated_at IS NULL;`);
    await client.execute(`CREATE UNIQUE INDEX idx_active_student_allocation ON hostel_bed_allocations (institution_id, student_id) WHERE vacated_at IS NULL;`);
  });

  describe("Negative-Path Boundary Guards", () => {
    it("rejects allocation if student does not exist", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: "non_existent_student",
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Student not found.");
    });

    it("rejects allocation on gender mismatch (female student in boys block)", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: femaleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Gender parity violation: student is female but block is boys");
    });

    it("rejects allocation if bed is marked for maintenance", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bedMaintId,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Bed is currently under maintenance.");
    });

    it("rejects allocation if staff is not an active warden for this block", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: unassignedStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Staff member is not an active assigned warden for this block.");
    });

    it("rejects allocation if warden assignment has been revoked", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: revokedStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Staff member is not an active assigned warden for this block.");
    });
  });

  describe("Capacity Limits & Concurrency Collisions", () => {
    it("allocates successfully when all invariants are satisfied", async () => {
      const res = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res.success).toBe(true);
      expect(res.allocationId).toBeDefined();

      const rows = await client.execute({
        sql: `SELECT * FROM hostel_bed_allocations WHERE id = ?;`,
        args: [res.allocationId!]
      });
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0].vacated_at).toBeNull();
    });

    it("detects and classifies active bed collision", async () => {
      // First allocation
      const firstRes = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });
      expect(firstRes.success).toBe(true);

      // Create a second male student
      const secondMaleId = `stud_male_2_${Date.now()}`;
      await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${secondMaleId}', '${instId}', 'Male 2', 'male');`);

      // Second allocation to the SAME bed
      const secondRes = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: secondMaleId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(secondRes.success).toBe(false);
      expect(secondRes.collisionType).toBe("bed_collision");
    });

    it("detects and classifies active student collision", async () => {
      // First allocation to bed 1
      const firstRes = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });
      expect(firstRes.success).toBe(true);

      // Second allocation for the SAME student to bed 2
      const secondRes = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed2Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(secondRes.success).toBe(false);
      expect(secondRes.collisionType).toBe("student_collision");
    });

    it("allows reallocation after vacating an active allocation", async () => {
      // Allocate bed 1
      const alloc = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: "2026-10-25T08:00:00.000Z",
      }, { isPostgres: false });
      expect(alloc.success).toBe(true);

      // Vacate bed 1
      const vacateRes = await vacateHostelBed(client, {
        institutionId: instId,
        allocationId: alloc.allocationId!,
        vacatedAt: "2026-10-25T12:00:00.000Z",
      }, { isPostgres: false });
      expect(vacateRes.success).toBe(true);

      // Second male student allocates now-vacated bed 1
      const secondMaleId = `stud_male_vac_${Date.now()}`;
      await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${secondMaleId}', '${instId}', 'Vac Student', 'male');`);

      const reallocRes = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: secondMaleId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: "2026-10-25T13:00:00.000Z",
      }, { isPostgres: false });
      expect(reallocRes.success).toBe(true);
    });

    it("rejects allocation when room capacity is exceeded", async () => {
      // Student 1 into bed 1
      const res1 = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed1Id,
        studentId: maleStudentId,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });
      expect(res1.success).toBe(true);

      // Student 2 into bed 2 (fills capacity of 2)
      const male2 = `stud_male_cap2_${Date.now()}`;
      await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${male2}', '${instId}', 'Male Cap 2', 'male');`);

      const res2 = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed2Id,
        studentId: male2,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });
      expect(res2.success).toBe(true);

      // Add a third bed to room 101, but room capacity is only 2!
      const bed3Id = `bed_b3_${Date.now()}`;
      await client.execute(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ('${bed3Id}', '${instId}', '${roomBoysId}', 'B3', 0);`);

      const male3 = `stud_male_cap3_${Date.now()}`;
      await client.execute(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ('${male3}', '${instId}', 'Male Cap 3', 'male');`);

      // Attempt allocating student 3 into bed 3 -> room capacity exceeded!
      const res3 = await allocateHostelBed(client, {
        institutionId: instId,
        bedId: bed3Id,
        studentId: male3,
        academicYearId,
        staffId: wardenStaffId,
        allocatedAt: new Date().toISOString(),
      }, { isPostgres: false });

      expect(res3.success).toBe(false);
      expect(res3.error).toBe("Room is at full capacity.");
    });
  });
});
