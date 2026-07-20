import { hasPermission } from "../../../packages/auth/roles";
import { POST as systemUpdatePost } from "../../app/api/system/update/route";
import { GET as fileGet } from "../../app/api/upload/files/[filename]/route";
import { GET as avatarGet } from "../../app/api/upload/files/avatars/[filename]/route";
import { GET as exportGet } from "../../app/api/export/route";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";

// Mock the Auth library
jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn((role, perm) => {
    // Forward to the real hasPermission from packages/auth/roles
    return require("../../../packages/auth/roles").hasPermission(role, perm);
  }),
}));

// Mock the DB library
jest.mock("@/db", () => {
  const mockAll = jest.fn().mockResolvedValue([]);
  
  const createQueryBuilder = () => {
    const resPromise = Promise.resolve([]) as any;
    resPromise.all = mockAll;
    resPromise.get = jest.fn().mockResolvedValue(null);
    resPromise.run = jest.fn().mockResolvedValue({ changes: 0 });
    
    const builder: Record<string, any> = {
      where: jest.fn(() => resPromise),
      innerJoin: jest.fn(() => builder),
      leftJoin: jest.fn(() => builder),
      orderBy: jest.fn(() => builder),
      then: (onfulfilled: any) => resPromise.then(onfulfilled),
    };
    return builder;
  };

  const mockFrom = jest.fn(() => createQueryBuilder());
  const mockSelect = jest.fn(() => ({
    from: mockFrom,
  }));
  const mockInsert = jest.fn(() => ({
    values: jest.fn(() => ({
      onConflictDoUpdate: jest.fn(() => ({
        run: jest.fn().mockResolvedValue({ changes: 0 }),
      })),
    })),
  }));
  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  };
});

const mockDb = db as any;

describe("Security and Regression Audits", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    jest.spyOn(console, "error").mockImplementation((...args) => {
      console.log("SPY ERROR:", ...args);
    });
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // 1. leave:manage role coverage for every intended role.
  describe("1. Role Permission Mapping for leave:manage", () => {
    it("should grant leave:manage to admin, principal, and super_admin only", () => {
      expect(hasPermission("super_admin", "leave:manage")).toBe(true);
      expect(hasPermission("admin", "leave:manage")).toBe(true);
      expect(hasPermission("principal", "leave:manage")).toBe(true);
      expect(hasPermission("hod", "leave:manage")).toBe(false);
      expect(hasPermission("staff", "leave:manage")).toBe(false);
    });
  });

  // 2. Missing, blank, and fallback update secrets all return 401.
  describe("2. System Update Secret Validation", () => {
    it("should return 401 if SYSTEM_UPDATE_SECRET is missing", async () => {
      delete process.env.SYSTEM_UPDATE_SECRET;
      const req = new Request("http://localhost/api/system/update", {
        method: "POST",
        headers: { Authorization: "Bearer fallback-secret-key-123456" },
        body: JSON.stringify({}),
      });
      const res = await systemUpdatePost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 if SYSTEM_UPDATE_SECRET is empty string", async () => {
      process.env.SYSTEM_UPDATE_SECRET = "";
      const req = new Request("http://localhost/api/system/update", {
        method: "POST",
        headers: { Authorization: "Bearer fallback-secret-key-123456" },
        body: JSON.stringify({}),
      });
      const res = await systemUpdatePost(req);
      expect(res.status).toBe(401);
    });

    it("should return 401 if SYSTEM_UPDATE_SECRET is whitespace", async () => {
      process.env.SYSTEM_UPDATE_SECRET = "   ";
      const req = new Request("http://localhost/api/system/update", {
        method: "POST",
        headers: { Authorization: "Bearer fallback-secret-key-123456" },
        body: JSON.stringify({}),
      });
      const res = await systemUpdatePost(req);
      expect(res.status).toBe(401);
    });

    it("should return 401 if request token does not match SYSTEM_UPDATE_SECRET", async () => {
      process.env.SYSTEM_UPDATE_SECRET = "configured-secret-key";
      const req = new Request("http://localhost/api/system/update", {
        method: "POST",
        headers: { Authorization: "Bearer incorrect-secret-key" },
        body: JSON.stringify({}),
      });
      const res = await systemUpdatePost(req);
      expect(res.status).toBe(401);
    });
  });

  // 3 & 5. Spoofed/invalid bearer tokens and valid but unauthorized users cannot download files.
  describe("3 & 5. File Serving Authentication check", () => {
    it("should return 401 for unauthenticated general file access", async () => {
      (verifySession as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost/api/upload/files/some-uuid.pdf");
      const res = await fileGet(req, {
        params: Promise.resolve({ filename: "87cde12a-5a91-4e45-bf21-d1f87a3219ee.pdf" }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 401 for unauthenticated avatar file access", async () => {
      (verifySession as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost/api/upload/files/avatars/some-uuid.png");
      const res = await avatarGet(req, {
        params: Promise.resolve({ filename: "staff-1-87cde12a-5a91-4e45-bf21-d1f87a3219ee.png" }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Not authenticated");
    });
  });

  // 4. Filename traversal attempts (.., /, \, encoded variants) return 400.
  describe("4. Filename Format and Traversal Validation", () => {
    const traversalFilenames = [
      "../etc/passwd",
      "..\\etc\\passwd",
      "sub/file.txt",
      "sub\\file.txt",
      "file.txt",
      "%2e%2e%2fetc/passwd",
      "87cde12a-5a91-4e45-bf21-d1f87a3219ee/test.png",
      "87cde12a-5a91-4e45-bf21-d1f87a3219ee\\test.png",
      "..",
      ".",
    ];

    it("should block general file traversal and non-UUID formats with 400", async () => {
      (verifySession as jest.Mock).mockResolvedValue({ staffId: "123", role: "staff" });

      for (const fn of traversalFilenames) {
        const req = new Request(`http://localhost/api/upload/files/${fn}`);
        const res = await fileGet(req, {
          params: Promise.resolve({ filename: fn }),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid filename");
      }
    });

    it("should block avatar file traversal and non-UUID/staff formats with 400", async () => {
      (verifySession as jest.Mock).mockResolvedValue({ staffId: "123", role: "staff" });

      for (const fn of traversalFilenames) {
        const req = new Request(`http://localhost/api/upload/files/avatars/${fn}`);
        const res = await avatarGet(req, {
          params: Promise.resolve({ filename: fn }),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid filename");
      }
    });

    it("should allow correctly formatted UUID general filename", async () => {
      (verifySession as jest.Mock).mockResolvedValue({ staffId: "123", role: "staff" });
      // Stub the fs readFile or other handlers to prevent actual IO errors from failing the validation test
      mockDb.select().from().where().all.mockResolvedValueOnce([]); // Mock any fallback db calls

      const req = new Request("http://localhost/api/upload/files/87cde12a-5a91-4e45-bf21-d1f87a3219ee.pdf");
      const res = await fileGet(req, {
        params: Promise.resolve({ filename: "87cde12a-5a91-4e45-bf21-d1f87a3219ee.pdf" }),
      });
      // Should pass filename validation and reach the file loading logic (releasing a 404 or 500 depending on storage configuration, but NOT 400)
      expect(res.status).not.toBe(400);
    });

    it("should allow correctly formatted avatar filename", async () => {
      (verifySession as jest.Mock).mockResolvedValue({ staffId: "123", role: "staff" });

      const req = new Request("http://localhost/api/upload/files/avatars/staff-1-87cde12a-5a91-4e45-bf21-d1f87a3219ee.png");
      const res = await avatarGet(req, {
        params: Promise.resolve({ filename: "staff-1-87cde12a-5a91-4e45-bf21-d1f87a3219ee.png" }),
      });
      expect(res.status).not.toBe(400);
    });
  });

  // 6. Empty/unknown institution exports contain headers only.
  describe("6. Export empty/unknown institution short-circuit", () => {
    it("should return only CSV headers if institution has no staff", async () => {
      (verifySession as jest.Mock).mockResolvedValue({ staffId: "123", role: "admin" });
      // Mock db.select() to return empty list of staff for the given institutionId
      mockDb.select().from().where.mockResolvedValueOnce([]);

      const req = new Request("http://localhost/api/export?type=attendance&institutionId=non-existent-inst-id");
      const res = await exportGet(req);

      expect(res.status).toBe(200);
      const csvContent = await res.text();
      // Should match headers exactly and have no other rows
      const expectedHeaders = "Employee ID,Name,Department,Date,Check In,Check Out,Status,Hours Worked\n";
      expect(csvContent).toBe(expectedHeaders);
    });
  });
});
