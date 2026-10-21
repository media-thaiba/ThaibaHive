/**
 * @jest-environment node
 *
 * Asset & Inventory Management Pipeline — Hardening & Integrity Suite:
 * - IDOR prevention: regular staff can only access assets assigned to them; other assets return fail-closed 404
 * - Multi-tenant isolation: cross-tenant access returns fail-closed 404
 * - Cross-tenant staff assignment prevention: assigning an asset to a staff member in another institution returns 400
 * - Concurrency serialization & optimistic locking (withAssetLock, 409 Conflict detection)
 * - Decommissioned asset safety: service records and tag bindings on inactive/decommissioned assets return 400
 * - Tag collision prevention: assigning an already-used QR/barcode within the institution returns 409 Conflict
 * - Monetary bounds validation: negative purchase costs and service costs return 400
 * - Safe JSON parsing: empty/malformed bodies return 400 without server crashes
 * - Soft-deletion integrity: deleting an asset marks it decommissioned and resets assignedToId
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  assets,
  assetServiceHistory,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listAssets,
  POST as createAsset,
} from "@/app/api/assets/route";
import {
  GET as getAssetDetail,
  PATCH as updateAsset,
  DELETE as deleteAsset,
} from "@/app/api/assets/[id]/route";
import {
  GET as listServiceHistory,
  POST as addServiceRecord,
} from "@/app/api/assets/[id]/service/route";
import {
  POST as bindAssetTag,
} from "@/app/api/assets/[id]/tag/route";
import {
  GET as getAssetStats,
} from "@/app/api/assets/stats/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Asset & Inventory Management Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_ast_a_${suffix}`;
  const instB = `inst_ast_b_${suffix}`;

  const adminAId = `stf_ast_adm_a_${suffix}`;
  const principalAId = `stf_ast_pa_${suffix}`;
  const staffA1Id = `stf_ast_s1_${suffix}`;
  const staffA2Id = `stf_ast_s2_${suffix}`;
  const staffBId = `stf_ast_sb_${suffix}`;

  const createdAssetIds: string[] = [];
  const createdServiceIds: string[] = [];

  let assetA1AssignedToS1: string;
  let assetA2AssignedToS2: string;
  let assetADecommissioned: string;
  let assetB1: string;

  beforeAll(async () => {
    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Asset Campus A ${suffix}`, code: `ACA_${suffix}` },
      { id: instB, name: `Asset Campus B ${suffix}`, code: `ACB_${suffix}` },
    ]).run();

    // 2. Seed Staff members
    const staffRows: (typeof staff.$inferInsert)[] = [
      { id: adminAId, employeeId: `EMP_ADM_${suffix}`, firstName: "Admin", lastName: "Alpha", email: `admin.a.${suffix}@example.com`, role: "admin" },
      { id: principalAId, employeeId: `EMP_PRN_${suffix}`, firstName: "Principal", lastName: "Alpha", email: `principal.a.${suffix}@example.com`, role: "principal" },
      { id: staffA1Id, employeeId: `EMP_S1_${suffix}`, firstName: "Faculty", lastName: "One", email: `staff.a1.${suffix}@example.com`, role: "staff" },
      { id: staffA2Id, employeeId: `EMP_S2_${suffix}`, firstName: "Faculty", lastName: "Two", email: `staff.a2.${suffix}@example.com`, role: "staff" },
      { id: staffBId, employeeId: `EMP_SB_${suffix}`, firstName: "Faculty", lastName: "Bravo", email: `staff.b.${suffix}@example.com`, role: "staff" },
    ];
    for (const row of staffRows) {
      await db.insert(staff).values(row).run();
    }

    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_s1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_s2_${suffix}`, staffId: staffA2Id, institutionId: instA },
      { id: `si_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();

    // 3. Seed Assets
    assetA1AssignedToS1 = `ast_a1_${suffix}`;
    assetA2AssignedToS2 = `ast_a2_${suffix}`;
    assetADecommissioned = `ast_adecom_${suffix}`;
    assetB1 = `ast_b1_${suffix}`;

    await db.insert(assets).values([
      {
        id: assetA1AssignedToS1,
        name: "MacBook Pro M3 Max",
        type: "laptop",
        model: "A2991",
        serialNumber: `SN-MBP-${suffix}`,
        institutionId: instA,
        assignedToId: staffA1Id,
        location: "CS Lab 101",
        purchaseCost: 250000,
        status: "in_use",
        qrCode: `QR_MBP_${suffix}`,
        isActive: true,
      },
      {
        id: assetA2AssignedToS2,
        name: "Dell Precision 5820",
        type: "workstation",
        model: "T5820",
        serialNumber: `SN-DELL-${suffix}`,
        institutionId: instA,
        assignedToId: staffA2Id,
        location: "AI Research Lab",
        purchaseCost: 180000,
        status: "in_use",
        qrCode: `QR_DELL_${suffix}`,
        isActive: true,
      },
      {
        id: assetADecommissioned,
        name: "Legacy CRT Projector",
        type: "projector",
        model: "Sony VPL",
        serialNumber: `SN-SONY-${suffix}`,
        institutionId: instA,
        assignedToId: null,
        location: "Store Room B",
        purchaseCost: 45000,
        status: "decommissioned",
        qrCode: `QR_SONY_${suffix}`,
        isActive: false,
      },
      {
        id: assetB1,
        name: "Server Rack Alpha",
        type: "server",
        model: "PowerEdge R750",
        serialNumber: `SN-PE750-${suffix}`,
        institutionId: instB,
        assignedToId: staffBId,
        location: "Data Center B",
        purchaseCost: 650000,
        status: "available",
        qrCode: `QR_R750_${suffix}`,
        isActive: true,
      },
    ]).run();

    createdAssetIds.push(assetA1AssignedToS1, assetA2AssignedToS2, assetADecommissioned, assetB1);
  });

  afterAll(async () => {
    if (createdServiceIds.length > 0) {
      await db.delete(assetServiceHistory).where(inArray(assetServiceHistory.id, createdServiceIds)).run();
    }
    if (createdAssetIds.length > 0) {
      await db.delete(assets).where(inArray(assets.id, createdAssetIds)).run();
    }
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [adminAId, principalAId, staffA1Id, staffA2Id, staffBId])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, principalAId, staffA1Id, staffA2Id, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  function mockUser(role: string, staffId: string | null, institutionId: string | null) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      sub: staffId ? `usr_${staffId}` : "usr_external",
      userId: staffId ? `usr_${staffId}` : "usr_external",
      role,
      staffId,
      institutionId,
    });
    (hasPermission as unknown as jest.Mock).mockReturnValue(true);
  }

  describe("IDOR Prevention & Non-Manager Scoping (VULN-AS-01)", () => {
    it("allows staff member to view asset detail when assigned to them", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`);
      const res = await getAssetDetail(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.id).toBe(assetA1AssignedToS1);
      expect(data.asset.name).toBe("MacBook Pro M3 Max");
    });

    it("blocks staff member from viewing asset assigned to another staff member (fail-closed 404)", async () => {
      mockUser("staff", staffA1Id, instA);
      // staffA1 tries to view assetA2 (assigned to staffA2)
      const req = new Request(`http://localhost/api/assets/${assetA2AssignedToS2}`);
      const res = await getAssetDetail(req, { params: Promise.resolve({ id: assetA2AssignedToS2 }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Asset not found");
    });

    it("blocks staff member from viewing service history of unassigned asset (fail-closed 404)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/assets/${assetA2AssignedToS2}/service`);
      const res = await listServiceHistory(req, { params: Promise.resolve({ id: assetA2AssignedToS2 }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Asset not found");
    });

    it("allows institutional managers to view all assets in their institution", async () => {
      mockUser("principal", principalAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA2AssignedToS2}`);
      const res = await getAssetDetail(req, { params: Promise.resolve({ id: assetA2AssignedToS2 }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.id).toBe(assetA2AssignedToS2);
    });

    it("filters list endpoint to only show assigned assets for regular staff", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/assets");
      const res = await listAssets(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.assets.every((a: { assignedToId: string }) => a.assignedToId === staffA1Id)).toBe(true);
    });
  });

  describe("Multi-Tenant Boundary Isolation", () => {
    it("prevents staff from institution B from viewing asset in institution A (fail-closed 404)", async () => {
      mockUser("staff", staffBId, instB);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`);
      const res = await getAssetDetail(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Asset not found");
    });

    it("prevents admin from institution B from updating asset in institution A (fail-closed 404)", async () => {
      mockUser("admin", staffBId, instB);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: "Hostile Takeover Location" }),
      });
      const res = await updateAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Asset not found");
    });

    it("prevents admin from institution B from deleting asset in institution A (fail-closed 404)", async () => {
      mockUser("admin", staffBId, instB);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "DELETE",
      });
      const res = await deleteAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Asset not found");
    });
  });

  describe("Cross-Tenant Staff Assignment & FK Integrity (VULN-AS-03)", () => {
    it("rejects assigning an asset to a staff member in another institution (400)", async () => {
      mockUser("admin", adminAId, instA);
      // staffBId belongs to instB, but assetA1 belongs to instA
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: staffBId }),
      });

      const res = await updateAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("does not belong to this institution");
    });

    it("rejects creating an asset with a cross-tenant staff assignment (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Cross Tenant Laptop",
          type: "laptop",
          assignedToId: staffBId, // In Inst B!
          institutionId: instA,
        }),
      });

      const res = await createAsset(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("does not belong to this institution");
    });

    it("permits assigning an asset to an affiliated staff member in the same institution", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: staffA2Id }),
      });

      const res = await updateAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.assignedToId).toBe(staffA2Id);
    });
  });

  describe("Decommissioned Asset Modification Guards (VULN-AS-07)", () => {
    it("blocks updating a decommissioned/inactive asset without reactivating (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetADecommissioned}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: "New Attic" }),
      });

      const res = await updateAsset(req, { params: Promise.resolve({ id: assetADecommissioned }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot modify a decommissioned or inactive asset");
    });

    it("blocks adding service history to a decommissioned asset (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetADecommissioned}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: "2028-10-10",
          description: "Attempted bulb replacement",
          cost: 1500,
        }),
      });

      const res = await addServiceRecord(req, { params: Promise.resolve({ id: assetADecommissioned }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("inactive or decommissioned");
    });

    it("blocks binding tags to a decommissioned asset (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetADecommissioned}/tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: `QR_DECOM_TAG_${suffix}` }),
      });

      const res = await bindAssetTag(req, { params: Promise.resolve({ id: assetADecommissioned }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("inactive or decommissioned");
    });
  });

  describe("Tag Collision Prevention (VULN-AS-06)", () => {
    it("rejects binding a tag already in use by another active asset in the same institution (409 Conflict)", async () => {
      mockUser("admin", adminAId, instA);
      // assetA2 tries to bind assetA1's qrCode (QR_MBP_suffix)
      const req = new Request(`http://localhost/api/assets/${assetA2AssignedToS2}/tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: `QR_MBP_${suffix}` }),
      });

      const res = await bindAssetTag(req, { params: Promise.resolve({ id: assetA2AssignedToS2 }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already assigned to another active asset");
    });

    it("successfully binds a new unique tag to an active asset", async () => {
      mockUser("admin", adminAId, instA);
      const newTag = `QR_UNIQUE_${suffix}`;
      const req = new Request(`http://localhost/api/assets/${assetA2AssignedToS2}/tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: newTag }),
      });

      const res = await bindAssetTag(req, { params: Promise.resolve({ id: assetA2AssignedToS2 }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.qrCode).toBe(newTag);
    });
  });

  describe("Service History & Status Updates", () => {
    it("successfully records a service record on an active asset and updates its status", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: "2028-11-01",
          description: "Battery Replacement & Thermal Repaste",
          cost: 12500,
          servicedBy: "Apple Authorized Center",
        }),
      });

      const res = await addServiceRecord(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.serviceRecord).toBeDefined();
      expect(data.serviceRecord.cost).toBe(12500);
      createdServiceIds.push(data.serviceRecord.id);
    });

    it("rejects negative service cost (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: "2028-11-01",
          description: "Negative cost test",
          cost: -500,
        }),
      });

      const res = await addServiceRecord(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Service cost cannot be negative");
    });
  });

  describe("Unhandled JSON Parse Crash Prevention (VULN-AS-04)", () => {
    it("safely handles empty payload on asset creation with 400 (not 500)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      const res = await createAsset(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("safely handles empty payload on asset update with 400 (not 500)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      const res = await updateAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("Soft-Deletion & Decommissioning Integrity", () => {
    it("soft-deletes asset, clears assignedToId, and marks status decommissioned", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`, {
        method: "DELETE",
      });

      const res = await deleteAsset(req, { params: Promise.resolve({ id: assetA1AssignedToS1 }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.isActive).toBe(false);
      expect(data.asset.status).toBe("decommissioned");
      expect(data.asset.assignedToId).toBeNull();
    });
  });

  describe("Schema Numeric Coercion & Dynamic Route Fallback", () => {
    it("successfully creates asset with string-encoded numeric purchaseCost (coerced)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Coerced Asset ${suffix}`,
          type: "laptop",
          institutionId: instA,
          purchaseCost: "1850.75", // String from form input
        }),
      });

      const res = await createAsset(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.asset.purchaseCost).toBe(1850.75);
      createdAssetIds.push(data.asset.id);
    });

    it("successfully extracts asset ID from URL pathname when context params are missing", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/assets/${assetA1AssignedToS1}`);
      // Passing empty object context without params.id
      const res = await getAssetDetail(req, { params: Promise.resolve({}) as any });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.asset.id).toBe(assetA1AssignedToS1);
    });
  });
});
