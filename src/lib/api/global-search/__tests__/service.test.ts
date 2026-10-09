import { globalSearch, getSearchSuggestions } from "../service";
import { db } from "@/db";
import {
  staff,
  students,
  tasks,
  institutions,
  staffInstitutions,
} from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Global Search Service Security, Tenant Isolation & Entity Coverage", () => {
  const instA = "inst-search-test-a";
  const instB = "inst-search-test-b";
  const staffAId = "staff-search-test-a";
  const staffBId = "staff-search-test-b";

  beforeAll(async () => {
    // Clean up
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instA));
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instB));
    await db.delete(students).where(eq(students.institutionId, instA));
    await db.delete(students).where(eq(students.institutionId, instB));
    await db.delete(tasks).where(eq(tasks.institutionId, instA));
    await db.delete(tasks).where(eq(tasks.institutionId, instB));
    await db.delete(staff).where(eq(staff.id, staffAId));
    await db.delete(staff).where(eq(staff.id, staffBId));
    await db.delete(institutions).where(eq(institutions.id, instA));
    await db.delete(institutions).where(eq(institutions.id, instB));

    // Seed test institutions
    await db.insert(institutions).values([
      { id: instA, name: "Search Test Campus Alpha", code: "STCA", type: "college" },
      { id: instB, name: "Search Test Campus Beta", code: "STCB", type: "college" },
    ]);

    // Seed test staff with sensitive fields
    await db.insert(staff).values([
      {
        id: staffAId,
        firstName: "Alice",
        lastName: "Searcher",
        email: "alice.search@alpha.edu",
        employeeId: "EMP-ALICE-01",
        designation: "Professor",
        role: "hod",
        passwordHash: "super-secret-password-hash-never-leak",
        faceEmbedding: "enc:sensitive-face-embedding-vector-data",
        fingerprintHash: "enc:fingerprint-hash-secret",
        aadhaar: "1234-5678-9012",
        pan: "ABCDE1234F",
        bankAccount: "987654321098",
        ifscCode: "SBIN0001234",
      },
      {
        id: staffBId,
        firstName: "Bob",
        lastName: "Searcher",
        email: "bob.search@beta.edu",
        employeeId: "EMP-BOB-02",
        designation: "Lecturer",
        role: "staff",
        passwordHash: "another-secret-password-hash",
        faceEmbedding: "enc:bob-face-embedding",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: "si-search-a", staffId: staffAId, institutionId: instA },
      { id: "si-search-b", staffId: staffBId, institutionId: instB },
    ]);

    // Seed test students
    await db.insert(students).values([
      {
        id: "stud-search-a",
        admissionNo: "ADM-ALPHA-99",
        firstName: "Charlie",
        lastName: "Student",
        email: "charlie@alpha.edu",
        institutionId: instA,
        faceEmbedding: "enc:student-face-vector",
      },
      {
        id: "stud-search-b",
        admissionNo: "ADM-BETA-99",
        firstName: "David",
        lastName: "Student",
        email: "david@beta.edu",
        institutionId: instB,
      },
    ]);

    // Seed test tasks
    await db.insert(tasks).values([
      {
        id: "task-search-a",
        title: "Search Term Task Alpha",
        description: "Task description for alpha campus search test",
        institutionId: instA,
        status: "todo",
      },
      {
        id: "task-search-b",
        title: "Search Term Task Beta",
        description: "Task description for beta campus search test",
        institutionId: instB,
        status: "todo",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instA));
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instB));
    await db.delete(students).where(eq(students.institutionId, instA));
    await db.delete(students).where(eq(students.institutionId, instB));
    await db.delete(tasks).where(eq(tasks.institutionId, instA));
    await db.delete(tasks).where(eq(tasks.institutionId, instB));
    await db.delete(staff).where(eq(staff.id, staffAId));
    await db.delete(staff).where(eq(staff.id, staffBId));
    await db.delete(institutions).where(eq(institutions.id, instA));
    await db.delete(institutions).where(eq(institutions.id, instB));
  });

  describe("Sensitive Field Exclusion (SEC-04 Compliance)", () => {
    it("never leaks passwordHash, faceEmbedding, biometric or banking fields in staff results", async () => {
      const results = await globalSearch("Searcher", ["staff"], 1, 10, "global");
      expect(results.staff.length).toBeGreaterThan(0);

      for (const item of results.staff) {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.nativeRoute).toBeDefined();

        const serialized = JSON.stringify(item);
        expect(serialized).not.toContain("passwordHash");
        expect(serialized).not.toContain("super-secret-password-hash");
        expect(serialized).not.toContain("faceEmbedding");
        expect(serialized).not.toContain("fingerprintHash");
        expect(serialized).not.toContain("1234-5678-9012");
        expect(serialized).not.toContain("ABCDE1234F");
        expect(serialized).not.toContain("987654321098");
      }
    });

    it("never leaks student faceEmbeddings or biometric data in student results", async () => {
      const results = await globalSearch("Student", ["students"], 1, 10, "global");
      expect(results.students.length).toBeGreaterThan(0);

      for (const item of results.students) {
        const serialized = JSON.stringify(item);
        expect(serialized).not.toContain("faceEmbedding");
        expect(serialized).not.toContain("student-face-vector");
      }
    });
  });

  describe("Tenant Isolation Enforcement", () => {
    it("restricts search results to the requested institution scope", async () => {
      const resultsA = await globalSearch("Task", ["tasks"], 1, 10, instA);
      expect(resultsA.tasks.every((t) => t.id === "task-search-a")).toBe(true);

      const resultsB = await globalSearch("Task", ["tasks"], 1, 10, instB);
      expect(resultsB.tasks.every((t) => t.id === "task-search-b")).toBe(true);
    });

    it("allows global searches across institutions when scopedInstitutionId is 'global'", async () => {
      const results = await globalSearch("Student", ["students"], 1, 10, "global");
      const studentIds = results.students.map((s) => s.id);
      expect(studentIds).toContain("stud-search-a");
      expect(studentIds).toContain("stud-search-b");
    });
  });

  describe("Hard Query Limits & Pagination", () => {
    it("caps limits at a maximum of 20 per entity type", async () => {
      const results = await globalSearch("Student", ["students"], 1, 100, "global");
      expect(results.students.length).toBeLessThanOrEqual(20);
    });

    it("returns empty result container on empty or whitespace query", async () => {
      const results = await globalSearch("   ", ["students", "staff"], 1, 10, "global");
      expect(results.totalResults).toBe(0);
      expect(results.students).toEqual([]);
      expect(results.staff).toEqual([]);
    });
  });

  describe("Search Suggestions", () => {
    it("returns relevant prefix and contains suggestions", async () => {
      const suggestions = await getSearchSuggestions("Char", instA);
      expect(suggestions.some((s) => s.includes("Charlie"))).toBe(true);
    });
  });
});
