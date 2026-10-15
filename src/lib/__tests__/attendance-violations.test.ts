import { GET } from "@/app/api/attendance/violations/route";
import { verifySession, hasPermission } from "@thaiba/auth";

const mockGet = jest.fn();
const mockAll = jest.fn();

const mockChain: Record<string, any> = {
  where: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  leftJoin: jest.fn(() => mockChain),
  orderBy: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  offset: jest.fn(() => mockChain),
  get: mockGet,
  all: mockAll,
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
  },
  attendanceLogs: {
    id: "id",
    staffId: "staffId",
    institutionId: "institutionId",
    date: "date",
    checkIn: "checkIn",
    checkOut: "checkOut",
    status: "status",
    presenceStatus: "presenceStatus",
    lastVerifiedAt: "lastVerifiedAt",
    geofenceViolations: "geofenceViolations",
  },
  staff: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    employeeId: "employeeId",
  },
}));

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
    resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("campus-1"),
  };
});

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockVerifySession = verifySession as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;

const violationRow = {
  id: "log-1",
  date: "2026-10-15",
  checkIn: "09:00",
  checkOut: null,
  status: "present",
  presenceStatus: "unverified",
  lastVerifiedAt: "2026-10-15T10:00:00.000Z",
  geofenceViolations: 3,
  institutionId: "campus-1",
  staffId: "staff-1",
  staffName: "Jane",
  staffLastName: "Doe",
  employeeId: "EMP001",
};

describe("GET /api/attendance/violations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/attendance/violations"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller lacks attendance:manage", async () => {
    mockVerifySession.mockResolvedValueOnce({ staffId: "staff-1", role: "staff" });
    mockHasPermission.mockReturnValueOnce(false);
    const res = await GET(new Request("http://localhost/api/attendance/violations"));
    expect(res.status).toBe(403);
  });

  it("lists violation rows for an authorized admin", async () => {
    mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
    mockHasPermission.mockReturnValueOnce(true);
    mockGet.mockResolvedValueOnce({ count: 2 });
    mockAll.mockResolvedValueOnce([violationRow, { ...violationRow, id: "log-2", geofenceViolations: 1 }]);

    const res = await GET(new Request("http://localhost/api/attendance/violations"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(50);
    expect(data.violations).toHaveLength(2);
    expect(data.violations[0].geofenceViolations).toBe(3);
    expect(data.violations[0].staffName).toBe("Jane");
  });

  it("scopes non-admin callers to their resolved institution", async () => {
    mockVerifySession.mockResolvedValueOnce({ staffId: "principal-1", role: "principal" });
    mockHasPermission.mockReturnValueOnce(true);
    mockGet.mockResolvedValueOnce({ count: 1 });
    mockAll.mockResolvedValueOnce([violationRow]);

    const res = await GET(new Request("http://localhost/api/attendance/violations"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    // resolved scope (campus-1 from injected session institution) must be applied
    expect(mockChain.where).toHaveBeenCalled();
  });

  it("clamps limit and supports pagination params", async () => {
    mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
    mockHasPermission.mockReturnValueOnce(true);
    mockGet.mockResolvedValueOnce({ count: 10 });
    mockAll.mockResolvedValueOnce([violationRow]);

    const res = await GET(
      new Request("http://localhost/api/attendance/violations?page=2&limit=9999")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.limit).toBe(200);
    expect(data.page).toBe(2);
    expect(mockChain.offset).toHaveBeenCalledWith(200);
  });

  it("returns an empty list when no violations match", async () => {
    mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
    mockHasPermission.mockReturnValueOnce(true);
    mockGet.mockResolvedValueOnce(undefined);
    mockAll.mockResolvedValueOnce([]);

    const res = await GET(
      new Request("http://localhost/api/attendance/violations?from=2026-10-01&to=2026-10-15")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.violations).toEqual([]);
    expect(data.total).toBe(0);
  });
});
