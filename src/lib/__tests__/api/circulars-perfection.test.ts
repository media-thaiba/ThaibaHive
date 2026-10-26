/**
 * @jest-environment node
 *
 * Circulars & Institutional Compliance Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - Schema bounds and input validation (title, description, file size, compliance status)
 * - 404 existence guards on [id] and [id]/compliance endpoints
 * - Multi-tenant campus compliance isolation (cross-institution update rejection)
 * - Cascading deletion of downloads and compliance records
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  circulars,
  circularDownloads,
  circularCampusCompliance,
  notifications,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { POST as createCircular } from "@/app/api/circulars/route";
import {
  GET as getCircular,
  PATCH as updateCircular,
  DELETE as deleteCircular,
} from "@/app/api/circulars/[id]/route";
import {
  GET as getCompliance,
  PATCH as updateCompliance,
} from "@/app/api/circulars/[id]/compliance/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Circulars & Institutional Compliance Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_circ_perf_a_${suffix}`;
  const instB = `inst_circ_perf_b_${suffix}`;

  const superAdminId = `stf_circ_sa_${suffix}`;
  const principalAId = `stf_circ_pa_${suffix}`;
  const principalBId = `stf_circ_pb_${suffix}`;
  const staffAId = `stf_circ_staff_a_${suffix}`;

  const asUser = (role: string, staffId: string, instId: string) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@test.local`,
      role,
      institutionId: instId,
    });
  };

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Circ Inst A ${suffix}`, code: `CIA_${suffix}`, isActive: true },
      { id: instB, name: `Circ Inst B ${suffix}`, code: `CIB_${suffix}`, isActive: true },
    ]);

    await db.insert(staff).values([
      {
        id: superAdminId,
        email: `sa_${suffix}@test.local`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      },
      {
        id: principalAId,
        email: `pa_${suffix}@test.local`,
        employeeId: `EMP_PA_${suffix}`,
        firstName: "Principal",
        lastName: "Alpha",
        role: "principal",
      },
      {
        id: principalBId,
        email: `pb_${suffix}@test.local`,
        employeeId: `EMP_PB_${suffix}`,
        firstName: "Principal",
        lastName: "Beta",
        role: "principal",
      },
      {
        id: staffAId,
        email: `staffa_${suffix}@test.local`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_circ_sa_${suffix}`, staffId: superAdminId, institutionId: instA },
      { id: `si_circ_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_circ_pb_${suffix}`, staffId: principalBId, institutionId: instB },
      { id: `si_circ_staffa_${suffix}`, staffId: staffAId, institutionId: instA },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(notifications).where(inArray(notifications.staffId, [superAdminId, principalAId, principalBId, staffAId])).run();
    } catch {
      // ignore
    }
    await db.delete(circularDownloads).run();
    await db.delete(circularCampusCompliance).run();
    await db.delete(circulars).where(inArray(circulars.uploadedById, [superAdminId, principalAId, principalBId])).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [superAdminId, principalAId, principalBId, staffAId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/circulars returns 400 on malformed JSON", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json_payload",
      });
      const res = await createCircular(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/circulars/[id] returns 400 on malformed JSON", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/any-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });
      const res = await updateCircular(req, contextParams("any-id"));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/circulars/[id]/compliance returns 400 on malformed JSON", async () => {
      // First create a circular so 404 isn't returned first
      asUser("principal", principalAId, instA);
      const createReq = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "JSON Test Circular",
          fileUrl: "https://example.com/file.pdf",
          targetInstitutionId: instA,
        }),
      });
      const createRes = await createCircular(createReq);
      expect(createRes.status).toBe(201);
      const { circular } = await createRes.json();

      const patchReq = new Request(`http://localhost/api/circulars/${circular.id}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{bad:json",
      });
      const res = await updateCompliance(patchReq, contextParams(circular.id));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    it("rejects empty title on circular creation", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "   ",
          fileUrl: "https://example.com/doc.pdf",
          targetInstitutionId: instA,
        }),
      });
      const res = await createCircular(req);
      expect(res.status).toBe(400);
    });

    it("rejects title exceeding 200 characters", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "A".repeat(201),
          fileUrl: "https://example.com/doc.pdf",
          targetInstitutionId: instA,
        }),
      });
      const res = await createCircular(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Title too long/i);
    });

    it("rejects negative fileSize", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Valid Title",
          fileUrl: "https://example.com/doc.pdf",
          fileSize: -100,
          targetInstitutionId: instA,
        }),
      });
      const res = await createCircular(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/File size cannot be negative/i);
    });

    it("rejects invalid status in compliance update", async () => {
      asUser("principal", principalAId, instA);
      const createReq = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Compliance Status Circular",
          fileUrl: "https://example.com/doc.pdf",
          targetInstitutionId: instA,
        }),
      });
      const createRes = await createCircular(createReq);
      const { circular } = await createRes.json();

      const patchReq = new Request(`http://localhost/api/circulars/${circular.id}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "arbitrary_invalid_status",
          institutionId: instA,
        }),
      });
      const res = await updateCompliance(patchReq, contextParams(circular.id));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid compliance status|Invalid option/i);
    });
  });

  describe("3. 404 Existence Guards", () => {
    it("GET /api/circulars/[id] returns 404 for non-existent circular", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/non-existent-id");
      const res = await getCircular(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });

    it("PATCH /api/circulars/[id] returns 404 for non-existent circular", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const res = await updateCircular(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });

    it("DELETE /api/circulars/[id] returns 404 for non-existent circular", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/non-existent-id", { method: "DELETE" });
      const res = await deleteCircular(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });

    it("GET /api/circulars/[id]/compliance returns 404 for non-existent circular", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/non-existent-id/compliance");
      const res = await getCompliance(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });

    it("PATCH /api/circulars/[id]/compliance returns 404 for non-existent circular", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/circulars/non-existent-id/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", institutionId: instA }),
      });
      const res = await updateCompliance(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });
  });

  describe("4. Multi-Tenant Compliance Isolation & State Machine", () => {
    let circularId: string;

    beforeAll(async () => {
      asUser("super_admin", superAdminId, instA);
      const createReq = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Multi-Campus Fire Safety Mandate",
          fileUrl: "https://example.com/safety.pdf",
          description: "All campuses must inspect fire exits",
        }),
      });
      const res = await createCircular(createReq);
      const data = await res.json();
      circularId = data.circular.id;
    });

    it("blocks Principal B from updating compliance for Institution A (Cross-Tenant Guard)", async () => {
      asUser("principal", principalBId, instB);
      const patchReq = new Request(`http://localhost/api/circulars/${circularId}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          institutionId: instA,
          coordinatorRemarks: "Malicious update from Beta campus",
        }),
      });
      const res = await updateCompliance(patchReq, contextParams(circularId));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/does not belong to the requested institution|Cannot update compliance for another institution|Cross-tenant access denied/i);
    });

    it("allows Principal A to update compliance for Institution A", async () => {
      asUser("principal", principalAId, instA);
      const patchReq = new Request(`http://localhost/api/circulars/${circularId}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          institutionId: instA,
          coordinatorRemarks: "All fire exits inspected and verified",
          completionEvidenceUrl: "https://example.com/inspection.pdf",
        }),
      });
      const res = await updateCompliance(patchReq, contextParams(circularId));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.compliance.status).toBe("completed");
      expect(data.compliance.completedAt).toBeTruthy();
    });

    it("GET /api/circulars/[id]/compliance returns percentage and checklist reflecting update", async () => {
      asUser("super_admin", superAdminId, instA);
      const getReq = new Request(`http://localhost/api/circulars/${circularId}/compliance`);
      const res = await getCompliance(getReq, contextParams(circularId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalCampuses).toBeGreaterThanOrEqual(2);
      expect(data.completedCount).toBeGreaterThanOrEqual(1);
      const campusAEntry = data.checklist.find((c: any) => c.institutionId === instA);
      expect(campusAEntry).toBeTruthy();
      expect(campusAEntry.status).toBe("completed");
    });
  });

  describe("5. Cascading Deletion of Compliance and Downloads", () => {
    it("deleting a circular removes circular, downloads, and compliance records", async () => {
      asUser("super_admin", superAdminId, instA);
      const createReq = new Request("http://localhost/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Temporary Circular For Deletion",
          fileUrl: "https://example.com/temp.pdf",
          targetInstitutionId: instA,
        }),
      });
      const createRes = await createCircular(createReq);
      const { circular } = await createRes.json();

      // Insert compliance record
      await db.insert(circularCampusCompliance).values({
        id: `ccc_cascade_${suffix}`,
        circularId: circular.id,
        institutionId: instA,
        status: "completed",
      });

      // Insert download record
      await db.insert(circularDownloads).values({
        id: `cdl_cascade_${suffix}`,
        circularId: circular.id,
        staffId: superAdminId,
      });

      // Delete circular
      const delReq = new Request(`http://localhost/api/circulars/${circular.id}`, { method: "DELETE" });
      const delRes = await deleteCircular(delReq, contextParams(circular.id));
      expect(delRes.status).toBe(200);

      // Verify cascading removal
      const remainingCirc = await db.select().from(circulars).where(eq(circulars.id, circular.id)).get();
      expect(remainingCirc).toBeUndefined();

      const remainingComp = await db.select().from(circularCampusCompliance).where(eq(circularCampusCompliance.circularId, circular.id)).all();
      expect(remainingComp.length).toBe(0);

      const remainingDown = await db.select().from(circularDownloads).where(eq(circularDownloads.circularId, circular.id)).all();
      expect(remainingDown.length).toBe(0);
    });
  });
});
