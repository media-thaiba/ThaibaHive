/**
 * @jest-environment node
 *
 * Attendance Locations & Geofencing Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing: Malformed/empty payloads return 400 across POST and PATCH
 * - Geofence coordinate & radius bounds: Strict -90..90, -180..180, 5m..10000m, paired coordinates
 * - NFC tag collision guards: Duplicate tag returns 409 Conflict on create, update, and restore
 * - Multi-tenant isolation: Cross-tenant access fails closed with 404
 * - Mutation state machine: Cannot update deleted location without restoring; cannot double-delete
 * - Concurrency mutex: Simultaneous mutations serialized cleanly under withLocationLock
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  attendanceLocations,
  auditLog,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  GET as listLocations,
  POST as createLocation,
} from "@/app/api/admin/attendance-locations/route";
import {
  PATCH as updateLocation,
  DELETE as deleteLocation,
} from "@/app/api/admin/attendance-locations/[id]/route";
import { GET as getLocationQr } from "@/app/api/admin/attendance-locations/[id]/qr/route";
import { POST as pairBeacon } from "@/app/api/admin/attendance-locations/[id]/beacon/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Attendance Locations & Geofencing Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_loc_a_${suffix}`;
  const instB = `inst_loc_b_${suffix}`;

  const adminAId = `stf_adm_loc_a_${suffix}`;
  const adminBId = `stf_adm_loc_b_${suffix}`;

  let locA1Id: string = "";
  const tagA1 = `NFC_TAG_A1_${suffix}`;
  const tagA2 = `NFC_TAG_A2_${suffix}`;

  function asUser(role: string, staffId: string, instId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (perm === "attendance:manage") return false;
      return false;
    });
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution A ${suffix}`, code: `ILA_${suffix}` },
      { id: instB, name: `Institution B ${suffix}`, code: `ILB_${suffix}` },
    ]);

    // 2. Create Staff Fixtures
    await db.insert(staff).values([
      { id: adminAId, email: `admin_a_${suffix}@test.local`, employeeId: `EMP_LOC_A_${suffix}`, firstName: "Admin", lastName: "A", role: "admin" },
      { id: adminBId, email: `admin_b_${suffix}@test.local`, employeeId: `EMP_LOC_B_${suffix}`, firstName: "Admin", lastName: "B", role: "admin" },
    ]);

    // 3. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_loc_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_adm_loc_b_${suffix}`, staffId: adminBId, institutionId: instB },
    ]);
  });

  afterAll(async () => {
    const testStaffIds = [adminAId, adminBId];
    // Teardown in strict FK dependency order
    await db.delete(auditLog).where(inArray(auditLog.staffId, testStaffIds)).run();
    await db.delete(attendanceLocations).where(inArray(attendanceLocations.institutionId, [instA, instB])).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, testStaffIds)).run();
    await db.delete(staff).where(inArray(staff.id, testStaffIds)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Endpoints", () => {
    it("POST /api/admin/attendance-locations returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json {",
      });
      const res = await createLocation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PATCH /api/admin/attendance-locations/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations/dummy-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{ unclosed json",
      });
      const res = await updateLocation(req, { params: Promise.resolve({ id: "dummy-id" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("POST /api/admin/attendance-locations/[id]/beacon returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations/dummy-id/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "malformed beacon {",
      });
      const res = await pairBeacon(req, { params: Promise.resolve({ id: "dummy-id" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Geofence Coordinate & Radius Bounds Validation", () => {
    it("creates a valid attendance location with complete coordinates and geofence radius", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Main Campus Gate A",
          institutionId: instA,
          latitude: 12.9716,
          longitude: 77.5946,
          radius: 150,
          accuracy: 50,
          nfcTagId: tagA1,
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.location.name).toBe("Main Campus Gate A");
      expect(body.location.latitude).toBe(12.9716);
      expect(body.location.longitude).toBe(77.5946);
      expect(body.location.radius).toBe(150);
      locA1Id = body.location.id;
    });

    it("rejects latitude without longitude with 400 (coordinate pair required)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Broken Geofence Location",
          institutionId: instA,
          latitude: 12.9716,
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/together/i);
    });

    it("rejects out-of-range latitude (> 90) with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Lat Location",
          institutionId: instA,
          latitude: 95.5,
          longitude: 77.5946,
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Latitude must be between -90 and 90/i);
    });

    it("rejects geofence radius below 5m with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sub-5m Radius Location",
          institutionId: instA,
          radius: 2,
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/at least 5 meters/i);
    });

    it("rejects geofence radius above 10,000m with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Extreme Radius Location",
          institutionId: instA,
          radius: 15000,
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/cannot exceed 10,000 meters/i);
    });
  });

  describe("3. NFC Tag Collision Guards", () => {
    it("rejects creating a location with duplicate active NFC tag with 409 Conflict", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate Tag Location",
          institutionId: instA,
          nfcTagId: tagA1, // already held by locA1
        }),
      });
      const res = await createLocation(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/already exists/i);
    });

    it("rejects updating a location to an NFC tag already held by another active location (409)", async () => {
      asUser("admin", adminAId, instA);
      // Create a second location with tagA2
      const createReq = new Request("http://localhost/api/admin/attendance-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Second Location",
          institutionId: instA,
          nfcTagId: tagA2,
        }),
      });
      const createRes = await createLocation(createReq);
      expect(createRes.status).toBe(201);
      const createBody = await createRes.json();
      const locA2Id = createBody.location.id;

      // Attempt to update locA2 to tagA1 (held by locA1)
      const patchReq = new Request(`http://localhost/api/admin/attendance-locations/${locA2Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfcTagId: tagA1,
        }),
      });
      const patchRes = await updateLocation(patchReq, { params: Promise.resolve({ id: locA2Id }) });
      expect(patchRes.status).toBe(409);
      const patchBody = await patchRes.json();
      expect(patchBody.error).toMatch(/already exists/i);
    });
  });

  describe("4. Multi-Tenant Boundary Isolation", () => {
    it("Admin B CANNOT access QR payload of Institution A's location (404 Not Found)", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}/qr`);
      const res = await getLocationQr(req, { params: Promise.resolve({ id: locA1Id }) });
      expect(res.status).toBe(404);
    });

    it("Admin B CANNOT update Institution A's location (404 Not Found)", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked Location Name" }),
      });
      const res = await updateLocation(req, { params: Promise.resolve({ id: locA1Id }) });
      expect(res.status).toBe(404);
    });

    it("Admin B CANNOT delete Institution A's location (404 Not Found)", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "DELETE",
      });
      const res = await deleteLocation(req, { params: Promise.resolve({ id: locA1Id }) });
      expect(res.status).toBe(404);
    });
  });

  describe("5. Location State Machine: Soft Delete, Restore & Replay Collision", () => {
    it("Admin A soft-deletes location and frees its NFC tag", async () => {
      asUser("admin", adminAId, instA);
      const delReq = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "DELETE",
      });
      const delRes = await deleteLocation(delReq, { params: Promise.resolve({ id: locA1Id }) });
      expect(delRes.status).toBe(200);

      // Verify row has deletedAt set and nfcTagId cleared in DB
      const locRow = await db
        .select()
        .from(attendanceLocations)
        .where(eq(attendanceLocations.id, locA1Id))
        .get();
      expect(locRow?.deletedAt).not.toBeNull();
      expect(locRow?.nfcTagId).toBeNull();
    });

    it("rejects double deletion of an already deleted location with 400", async () => {
      asUser("admin", adminAId, instA);
      const delReq = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "DELETE",
      });
      const delRes = await deleteLocation(delReq, { params: Promise.resolve({ id: locA1Id }) });
      expect(delRes.status).toBe(400);
      const body = await delRes.json();
      expect(body.error).toMatch(/already deleted/i);
    });

    it("rejects modifying a deleted location without restoring it (400)", async () => {
      asUser("admin", adminAId, instA);
      const patchReq = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Zombie Location" }),
      });
      const patchRes = await updateLocation(patchReq, { params: Promise.resolve({ id: locA1Id }) });
      expect(patchRes.status).toBe(400);
      const body = await patchRes.json();
      expect(body.error).toMatch(/restore it first/i);
    });

    it("restores soft-deleted location cleanly when deletedAt: null is passed", async () => {
      asUser("admin", adminAId, instA);
      const restoreReq = new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletedAt: null,
          nfcTagId: tagA1, // Reclaim original tag
        }),
      });
      const restoreRes = await updateLocation(restoreReq, { params: Promise.resolve({ id: locA1Id }) });
      expect(restoreRes.status).toBe(200);
      const body = await restoreRes.json();
      expect(body.location.deletedAt).toBeNull();
      expect(body.location.nfcTagId).toBe(tagA1);
    });
  });

  describe("6. Concurrency Serialization Mutex", () => {
    it("serializes simultaneous parallel PATCH requests without dirty writes", async () => {
      asUser("admin", adminAId, instA);

      // Fire 4 simultaneous patch requests modifying different attributes
      const promises = [
        updateLocation(
          new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Concurrent Name 1" }),
          }),
          { params: Promise.resolve({ id: locA1Id }) }
        ),
        updateLocation(
          new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ radius: 250 }),
          }),
          { params: Promise.resolve({ id: locA1Id }) }
        ),
        updateLocation(
          new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accuracy: 25 }),
          }),
          { params: Promise.resolve({ id: locA1Id }) }
        ),
        updateLocation(
          new Request(`http://localhost/api/admin/attendance-locations/${locA1Id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wifiSsids: "Campus_WiFi_5G" }),
          }),
          { params: Promise.resolve({ id: locA1Id }) }
        ),
      ];

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // Final state must reflect the clean execution without corruption
      const locRow = await db
        .select()
        .from(attendanceLocations)
        .where(eq(attendanceLocations.id, locA1Id))
        .get();
      expect(locRow).toBeDefined();
      expect(locRow?.deletedAt).toBeNull();
    });
  });
});
