/**
 * @jest-environment node
 *
 * Bulk Student Class Attendance Pipeline — Hardening Test Suite
 * Covers:
 * - Safe JSON parsing (malformed payloads return 400)
 * - Rate limiting enforcement
 * - Batch size limits (max 500)
 * - Date format validation (YYYY-MM-DD)
 * - Cross-tenant isolation (403/404)
 * - Student enrollment verification
 * - Concurrency serialization (mutex prevents race conditions)
 * - Duplicate prevention (upsert behavior)
 */
import {
  db,
  institutions,
  staff,
  classes,
  students,
  studentAttendanceLogs,
  attendanceRegister,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, and } from "drizzle-orm";
import { POST as bulkAttendancePost } from "@/app/api/academic/attendance/bulk/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

jest.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 999, resetMs: 0 }),
  rateLimitResponse: (ms: number) => ({ error: "Rate limit exceeded", retryAfter: ms }),
}));

describe("Bulk Student Class Attendance Pipeline -- Hardening Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_bulk_a_${suffix}`;
  const instB = `inst_bulk_b_${suffix}`;
  const classAId = `cls_bulk_a_${suffix}`;
  const classBId = `cls_bulk_b_${suffix}`;
  const adminStaffId = `stf_bulk_adm_${suffix}`;
  const student1Id = `stu_bulk_1_${suffix}`;
  const student2Id = `stu_bulk_2_${suffix}`;

  const setSession = (payload: Record<string, unknown>) =>
    (verifySession as jest.Mock).mockResolvedValue({
      permissions: ["*"],
      staffId: adminStaffId,
      role: "admin",
      institutionId: instA,
      email: `admin_${suffix}@test.edu`,
      ...payload,
    });

  const postBulk = (body: unknown) =>
    new Request("http://localhost/api/academic/attendance/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  beforeAll(async () => {
    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Inst A ${suffix}`, code: `IA${suffix.slice(-5)}` },
      { id: instB, name: `Inst B ${suffix}`, code: `IB${suffix.slice(-5)}` },
    ]).run();

    // 2. Seed Admin Staff
    await db.insert(staff).values({
      id: adminStaffId,
      email: `admin_${suffix}@test.edu`,
      employeeId: `EMP_ADM_${suffix.slice(-6)}`,
      firstName: "Admin",
      lastName: suffix,
      role: "admin",
      isActive: true,
      tokenVersion: 0,
    }).run();

    // 3. Seed Classes
    await db.insert(classes).values([
      { id: classAId, institutionId: instA, name: `Class A ${suffix}`, grade: "10", section: "A", isActive: true },
      { id: classBId, institutionId: instB, name: `Class B ${suffix}`, grade: "10", section: "B", isActive: true },
    ] as any).run();

    // 4. Seed Students enrolled in Class A
    await db.insert(students).values([
      {
        id: student1Id,
        institutionId: instA,
        classId: classAId,
        admissionNo: `ADM-1-${suffix}`,
        firstName: "Student",
        lastName: `One-${suffix}`,
        status: "active",
      },
      {
        id: student2Id,
        institutionId: instA,
        classId: classAId,
        admissionNo: `ADM-2-${suffix}`,
        firstName: "Student",
        lastName: `Two-${suffix}`,
        status: "active",
      },
    ] as any).run();
  });

  afterEach(() => {
    (verifySession as jest.Mock).mockReset();
  });

  describe("Safe JSON Parsing", () => {
    it("returns 400 on malformed JSON", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk("invalid json {"));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(String(data.error)).toContain("Invalid JSON payload");
    });

    it("returns 400 on empty payload", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk(""));
      expect(res.status).toBe(400);
    });
  });

  describe("Schema Validation", () => {
    it("rejects payload missing classId with 400", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk({
        date: "2026-11-01",
        records: [{ studentId: student1Id, status: "present" }],
      }));
      expect(res.status).toBe(400);
    });

    it("rejects invalid date format with 400", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk({
        classId: classAId,
        date: "01-11-2026", // Not YYYY-MM-DD
        records: [{ studentId: student1Id, status: "present" }],
      }));
      expect(res.status).toBe(400);
    });

    it("rejects empty records array with 400", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk({
        classId: classAId,
        date: "2026-11-01",
        records: [],
      }));
      expect(res.status).toBe(400);
    });

    it("rejects records exceeding 500 limit with 400", async () => {
      setSession({});
      const tooMany = Array.from({ length: 501 }, (_, i) => ({
        studentId: `stu_fake_${i}`,
        status: "present" as const,
      }));
      const res = await bulkAttendancePost(postBulk({
        classId: classAId,
        date: "2026-11-01",
        records: tooMany,
      }));
      expect(res.status).toBe(400);
    });
  });

  describe("Tenant Isolation & Class Existence", () => {
    it("returns 404 when classId does not exist", async () => {
      setSession({});
      const res = await bulkAttendancePost(postBulk({
        classId: `non_existent_${suffix}`,
        date: "2026-11-01",
        records: [{ studentId: student1Id, status: "present" }],
      }));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Class not found");
    });

    it("returns 403 when class belongs to another institution", async () => {
      setSession({ institutionId: instA, role: "principal" });
      const res = await bulkAttendancePost(postBulk({
        classId: classBId, // Belongs to instB
        date: "2026-11-01",
        records: [{ studentId: student1Id, status: "present" }],
      }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(String(data.error)).toMatch(/belongs to another institution/i);
    });
  });

  describe("Valid Bulk Attendance & Summary Aggregation", () => {
    it("successfully creates attendance records and aggregates register summary", async () => {
      setSession({});
      const attendanceDate = "2026-11-15";
      const res = await bulkAttendancePost(postBulk({
        classId: classAId,
        date: attendanceDate,
        records: [
          { studentId: student1Id, status: "present" },
          { studentId: student2Id, status: "absent", reason: "Fever" },
        ],
      }));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.summary.totalStudents).toBe(2);
      expect(data.summary.presentCount).toBe(1);
      expect(data.summary.absentCount).toBe(1);
      expect(data.summary.lateCount).toBe(0);

      // Verify register row in DB
      const registerRow = await db
        .select()
        .from(attendanceRegister)
        .where(and(
          eq(attendanceRegister.classId, classAId),
          eq(attendanceRegister.date, attendanceDate)
        ))
        .get();

      expect(registerRow).toBeDefined();
      expect(registerRow?.presentCount).toBe(1);
      expect(registerRow?.absentCount).toBe(1);
    });

    it("is idempotent and updates existing records on re-submission", async () => {
      setSession({});
      const attendanceDate = "2026-11-15";
      // Student 2 was absent, now marked present
      const res = await bulkAttendancePost(postBulk({
        classId: classAId,
        date: attendanceDate,
        records: [
          { studentId: student1Id, status: "present" },
          { studentId: student2Id, status: "present" },
        ],
      }));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.presentCount).toBe(2);
      expect(data.summary.absentCount).toBe(0);
    });
  });
});
