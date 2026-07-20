import { GET, PUT } from "@/app/api/attendance/settings/route";
import { verifySession, hasPermission } from "@/lib/auth";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockReturning = jest.fn();

const mockChain: Record<string, any> = {
  where: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  get: mockGet,
  all: mockAll,
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => ({
            get: mockGet,
          })),
        })),
      })),
    })),
    transaction: jest.fn(async (fn: any) => {
      const tx = {
        select: jest.fn(() => mockChain),
        insert: jest.fn(() => ({
          values: jest.fn(() => ({
            returning: jest.fn(() => ({
              get: mockGet,
            })),
          })),
        })),
        update: jest.fn(() => ({
          set: jest.fn(() => ({
            where: jest.fn(() => ({
              returning: jest.fn(() => ({
                get: mockGet,
              })),
            })),
          })),
        })),
      };
      return fn(tx);
    }),
  },
  presenceVerificationSettings: {
    id: "id",
    institutionId: "institutionId",
    isEnabled: "isEnabled",
    shadowMode: "shadowMode",
    checkIntervalMinutes: "checkIntervalMinutes",
    gracePeriodMinutes: "gracePeriodMinutes",
    autoCheckoutOnViolation: "autoCheckoutOnViolation",
    geofenceRadiusMeters: "geofenceRadiusMeters",
    lowBatteryIntervalMinutes: "lowBatteryIntervalMinutes",
    criticalBatterySuspend: "criticalBatterySuspend",
  },
  staffInstitutions: {
    staffId: "staffId",
    institutionId: "institutionId",
  },
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

jest.mock("@/lib/api/activity-log", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockVerifySession = verifySession as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;

describe("Attendance Verification Settings Endpoints", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockReturning.mockReset();
    jest.clearAllMocks();
  });

  describe("GET Handler", () => {
    it("should return 401 if not authenticated", async () => {
      mockVerifySession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost/api/attendance/settings");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 if not authorized (staff role)", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "staff-1", role: "staff" });
      mockHasPermission.mockReturnValueOnce(false);
      const req = new Request("http://localhost/api/attendance/settings");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return global settings for global admin if no institutionId is passed", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      mockHasPermission.mockReturnValueOnce(true);
      const mockSettings = { id: "global-1", institutionId: null, geofenceRadiusMeters: 200 };
      mockGet.mockResolvedValueOnce(mockSettings); // global settings query

      const req = new Request("http://localhost/api/attendance/settings");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings).toEqual(mockSettings);
    });

    it("should fall back to default settings if no global settings row exists", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      mockHasPermission.mockReturnValueOnce(true);
      mockGet.mockResolvedValueOnce(undefined); // global settings query returning null

      const req = new Request("http://localhost/api/attendance/settings");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings.id).toBeNull();
      expect(data.settings.geofenceRadiusMeters).toBe(150); // fallback default
    });

    it("should return campus settings for principal authorized for that campus", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "principal-1", role: "principal" });
      mockHasPermission.mockReturnValueOnce(true);
      
      // Mock isInstitutionPrincipal check
      mockGet.mockResolvedValueOnce({ staffId: "principal-1", institutionId: "campus-1" }); // principal assignment query
      
      // Mock settings query
      const mockSettings = { id: "settings-1", institutionId: "campus-1", geofenceRadiusMeters: 100 };
      mockGet.mockResolvedValueOnce(mockSettings);

      const req = new Request("http://localhost/api/attendance/settings?institutionId=campus-1");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings).toEqual(mockSettings);
    });

    it("should reject principal with 403 if querying a different campus (cross-campus spoofing)", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "principal-1", role: "principal" });
      mockHasPermission.mockReturnValueOnce(true);
      
      // Mock isInstitutionPrincipal check returning undefined (not assigned to campus-2)
      mockGet.mockResolvedValueOnce(undefined);

      const req = new Request("http://localhost/api/attendance/settings?institutionId=campus-2");
      const res = await GET(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PUT Handler", () => {
    const validPayload = {
      isEnabled: true,
      shadowMode: false,
      checkIntervalMinutes: 15,
      gracePeriodMinutes: 10,
      autoCheckoutOnViolation: true,
      geofenceRadiusMeters: 200,
      lowBatteryIntervalMinutes: 20,
      criticalBatterySuspend: true,
    };

    it("should reject invalid range bounds with 400", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "admin-1", role: "admin" });
      mockHasPermission.mockReturnValueOnce(true);

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...validPayload,
          geofenceRadiusMeters: 9999, // exceeds 5000 limit
        }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });

    it("should allow principal to modify their own campus settings", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "principal-1", role: "principal" });
      mockHasPermission.mockReturnValueOnce(true);
      
      // isInstitutionPrincipal mock
      mockGet.mockResolvedValueOnce({ staffId: "principal-1", institutionId: "campus-1" });
      
      // Mock existing settings query
      const existingSettings = { id: "settings-1", institutionId: "campus-1", ...validPayload };
      mockGet.mockResolvedValueOnce(existingSettings);
      
      // Mock update query
      mockGet.mockResolvedValueOnce({ id: "settings-1", institutionId: "campus-1", ...validPayload, checkIntervalMinutes: 30 });

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...validPayload,
          institutionId: "campus-1",
          checkIntervalMinutes: 30,
        }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("should block principal with 403 when updating global settings (null institutionId)", async () => {
      mockVerifySession.mockResolvedValueOnce({ staffId: "principal-1", role: "principal" });
      mockHasPermission.mockReturnValueOnce(true);

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...validPayload,
          institutionId: null,
        }),
      });
      const res = await PUT(req);
      expect(res.status).toBe(403);
    });
  });
});
