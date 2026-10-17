/**
 * @jest-environment node
 */
import { db, institutions, staff, staffInstitutions, visitors, visitorPasses } from "@/db";
import { verifySession } from "@thaiba/auth";
import { inArray } from "drizzle-orm";
import { PATCH as patchVisitor } from "@/app/api/visitors/[id]/route";
import { GET as verifyGet, POST as verifyPost } from "@/app/api/visitors/verify/route";
import { POST as issuePass } from "@/app/api/visitors/pass/issue/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Visitor lifecycle routes — terminal guards, pass issue windows, and signed pass verification", () => {
  const suffix = Date.now().toString();
  const instA = `inst_vis_a_${suffix}`;
  const instACode = `vsa${suffix.slice(-4)}`;
  const instB = `inst_vis_b_${suffix}`;
  const adminId = `stf_vis_admin_${suffix}`;
  const hostId = `stf_vis_host_${suffix}`;
  const vInId = `vis_in_${suffix}`;
  const vOutId = `vis_out_${suffix}`;
  const vOtherId = `vis_other_${suffix}`;

  const mockSession = () => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: adminId,
      staffId: adminId,
      email: `visadmin_${suffix}@thaiba.edu`,
      role: "super_admin",
      institutionId: instA,
      permissions: ["*"],
    });
  };

  // Tenant-scoped non-admin session (member of instA only) — no global bypass
  const mockStaffSession = () => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: hostId,
      staffId: hostId,
      email: `vishost_${suffix}@thaiba.edu`,
      role: "staff",
      institutionId: instA,
      permissions: ["*"],
    });
  };

  const jsonRequest = (body: unknown): Request =>
    new Request("https://thaiba.edu/api/visitors/test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const patchWithId = (id: string, body: unknown) =>
    patchVisitor(jsonRequest(body), { params: Promise.resolve({ id }) });

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Visitor School A ${suffix}`, code: instACode },
      { id: instB, name: `Visitor School B ${suffix}`, code: `vsb${suffix.slice(-4)}` },
    ]);
    await db.insert(staff).values([
      {
        id: adminId,
        email: `visadmin_${suffix}@thaiba.edu`,
        employeeId: `EMP-VSA-${suffix.slice(-4)}`,
        firstName: "Visitor",
        lastName: "Admin",
        role: "super_admin",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: hostId,
        email: `vishost_${suffix}@thaiba.edu`,
        employeeId: `EMP-VSH-${suffix.slice(-4)}`,
        firstName: "Host",
        lastName: "Staff",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_va_${suffix}`, staffId: adminId, institutionId: instA },
      { id: `si_vh_${suffix}`, staffId: hostId, institutionId: instA },
    ]);
    await db.insert(visitors).values([
      {
        id: vInId,
        name: "Checked In Visitor",
        purpose: "Meeting",
        checkIn: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: "checked_in",
        hostStaffId: hostId,
        institutionId: instA,
      },
      {
        id: vOutId,
        name: "Checked Out Visitor",
        purpose: "Delivery",
        checkIn: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        checkOut: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: "checked_out",
        hostStaffId: hostId,
        institutionId: instA,
      },
      {
        id: vOtherId,
        name: "Other Tenant Visitor",
        purpose: "Audit",
        checkIn: new Date().toISOString(),
        status: "checked_in",
        institutionId: instB,
      },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(visitorPasses).where(inArray(visitorPasses.institutionId, [instA]));
      await db.delete(visitors).where(inArray(visitors.id, [vInId, vOutId, vOtherId]));
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [adminId, hostId]));
      await db.delete(staff).where(inArray(staff.id, [adminId, hostId]));
      await db.delete(institutions).where(inArray(institutions.id, [instA, instB]));
    } catch {
      // Cleanup best-effort
    }
  });

  describe("PATCH /api/visitors/[id] terminal-state guards", () => {
    it("rejects status updates on an already checked-out visitor with 409", async () => {
      mockSession();
      const res = await patchWithId(vOutId, { status: "checked_in" });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already checked out");
    });

    it("allows notes-only corrections on a checked-out visitor", async () => {
      mockSession();
      const res = await patchWithId(vOutId, { notes: "gate log reconciled" });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visitor.notes).toBe("gate log reconciled");
    });

    it("rejects invalid status enum values with 400", async () => {
      mockSession();
      const res = await patchWithId(vInId, { status: "on_vacation" });
      expect(res.status).toBe(400);
    });

    it("rejects malformed checkOut datetimes with 400", async () => {
      mockSession();
      const res = await patchWithId(vInId, { checkOut: "not-a-datetime" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for visitors of another tenant (tenant-scoped staff session)", async () => {
      mockStaffSession();
      const res = await patchVisitor(
        new Request("https://thaiba.edu/api/visitors/test", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            // Staff sessions resolve their tenant scope from the subdomain host
            Host: `${instACode}.thaibahive.edu`,
          },
          body: JSON.stringify({ notes: "cross-tenant attempt" }),
        }),
        { params: Promise.resolve({ id: vOtherId }) }
      );
      expect(res.status).toBe(404);
    });

    it("rejects invalid JSON bodies with 400", async () => {
      mockSession();
      const res = await patchVisitor(
        new Request("https://thaiba.edu/api/visitors/test", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{broken",
        }),
        { params: Promise.resolve({ id: vInId }) }
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/visitors/verify gate actions", () => {
    it("completes check_out for a checked-in visitor", async () => {
      mockSession();
      const res = await verifyPost(
        new Request("https://thaiba.edu/api/visitors/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: vInId, action: "check_out" }),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visitor.status).toBe("checked_out");
      expect(data.visitor.checkOut).toBeTruthy();
    });

    it("rejects a duplicate check_out with 400 (offline replay / double gate scan)", async () => {
      mockSession();
      const res = await verifyPost(
        new Request("https://thaiba.edu/api/visitors/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: vOutId, action: "check_out" }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("expired");
    });

    it("validates action parameter", async () => {
      mockSession();
      const res = await verifyPost(
        new Request("https://thaiba.edu/api/visitors/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: vInId, action: "teleport" }),
        })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/visitors/pass/issue signed pass lifecycle", () => {
    it("rejects an inverted validity window with 400", async () => {
      mockSession();
      const now = Date.now();
      const res = await issuePass(
        new Request("https://thaiba.edu/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: "Window Test",
            hostStaffId: hostId,
            validFrom: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
            validUntil: new Date(now).toISOString(),
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it("rejects unparseable validity datetimes with 400", async () => {
      mockSession();
      const res = await issuePass(
        new Request("https://thaiba.edu/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: "NaN Test",
            hostStaffId: hostId,
            validFrom: "garbage-from",
            validUntil: "garbage-until",
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it("rejects validity windows that already ended with 400", async () => {
      mockSession();
      const res = await issuePass(
        new Request("https://thaiba.edu/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: "Expired Test",
            hostStaffId: hostId,
            validFrom: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            validUntil: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it("issues a signed pass and the returned qrPayload verifies via GET /api/visitors/verify", async () => {
      mockSession();
      const now = Date.now();
      const res = await issuePass(
        new Request("https://thaiba.edu/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: "Happy Path Visitor",
            visitorPhone: "+91 90000 00000",
            hostStaffId: hostId,
            purpose: "Campus tour",
            validFrom: new Date(now - 60 * 60 * 1000).toISOString(),
            validUntil: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
          }),
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.qrPayload).toMatch(/^VIS\|/);
      expect(data.pass.qrSignature).toBeTruthy();
      expect(data.pass.institutionId).toBe(instA);

      // Gate scan: the signed payload must verify without touching the DB
      const verifyRes = await verifyGet(
        new Request(
          `https://thaiba.edu/api/visitors/verify?passToken=${encodeURIComponent(data.qrPayload)}`
        )
      );
      expect(verifyRes.status).toBe(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.valid).toBe(true);
      expect(verifyData.status).toBe("APPROVED");
    });

    it("rejects a tampered qrPayload at the verify endpoint", async () => {
      mockSession();
      const now = Date.now();
      const res = await issuePass(
        new Request("https://thaiba.edu/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: "Tamper Test",
            hostStaffId: hostId,
            validFrom: new Date(now - 60 * 60 * 1000).toISOString(),
            validUntil: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
          }),
        })
      );
      const data = await res.json();
      const tampered = data.qrPayload.replace(/inst_[a-z]+/, "inst_FORGED");
      const verifyRes = await verifyGet(
        new Request(
          `https://thaiba.edu/api/visitors/verify?passToken=${encodeURIComponent(tampered)}`
        )
      );
      expect(verifyRes.status).toBe(400);
    });
  });
});
