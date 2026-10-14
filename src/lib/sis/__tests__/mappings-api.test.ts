import { GET as getMappings } from "@/app/api/sis/mappings/route";
import { POST as resolveMapping } from "@/app/api/sis/mappings/[id]/resolve/route";
import { RecordMapper } from "../record-mapper";
import { setTenantFeatureFlag, clearTenantFeatureOverrides } from "@/lib/features";

const mockSession = {
  current: {
    userId: "usr_admin",
    staffId: "usr_admin",
    email: "admin@thaiba.edu",
    role: "admin",
    institutionId: "inst_campus_alpha",
    permissions: ["sis:read", "sis:manage", "sis:sync"],
  } as any,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(mockSession.current)),
    resolveInstitutionScopeForSession: jest.fn().mockImplementation(() =>
      Promise.resolve(mockSession.current?.institutionId || "inst_campus_alpha")
    ),
  };
});

describe("Wave 3: SIS Mappings Review Queue API", () => {
  const tenantA = "inst_campus_alpha";

  beforeEach(() => {
    RecordMapper.setUseMemory(true);
    RecordMapper.clearMemory();
    clearTenantFeatureOverrides();

    mockSession.current = {
      userId: "usr_admin",
      staffId: "usr_admin",
      email: "admin@thaiba.edu",
      role: "admin",
      institutionId: tenantA,
      permissions: ["sis:read", "sis:manage", "sis:sync"],
    };

    setTenantFeatureFlag(tenantA, "sis_sync", true);
  });

  afterEach(() => {
    RecordMapper.clearMemory();
    clearTenantFeatureOverrides();
  });

  it("returns 403 Forbidden when staff role attempts to resolve mapping (Gate 13)", async () => {
    mockSession.current = {
      userId: "usr_staff",
      staffId: "usr_staff",
      email: "staff@thaiba.edu",
      role: "staff",
      institutionId: tenantA,
      permissions: [],
    };

    const req = new Request("http://localhost/api/sis/mappings/sismq_123/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "map", localTable: "students", localId: "stu_1" }),
    });

    const res = await resolveMapping(req, { params: Promise.resolve({ id: "sismq_123" }) });
    expect(res.status).toBe(403);
  });

  it("lists mapping items for tenant", async () => {
    await RecordMapper.processRecord(tenantA, "sisc_1", {
      entityType: "students",
      externalId: "EXT_MAP_1",
      sourceStandard: "edfi",
      payload: { name: "Pending Student" },
    });

    const req = new Request("http://localhost/api/sis/mappings");
    const res = await getMappings(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].externalId).toBe("EXT_MAP_1");
  });

  it("resolves mapping queue item", async () => {
    await RecordMapper.processRecord(tenantA, "sisc_1", {
      entityType: "students",
      externalId: "EXT_MAP_2",
      sourceStandard: "edfi",
      payload: { name: "Another Student" },
    });

    const [item] = await RecordMapper.listQueueItems(tenantA);

    const req = new Request(`http://localhost/api/sis/mappings/${item.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "map",
        localTable: "students",
        localId: "stu_mapped_99",
      }),
    });

    const res = await resolveMapping(req, { params: Promise.resolve({ id: item.id }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.item.status).toBe("mapped");
  });
});
