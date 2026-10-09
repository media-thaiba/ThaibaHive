let mockSession: any = null;

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(async () => mockSession),
    hasPermission: jest.fn((role: string, perm: string) => {
      if (role === "admin" || role === "super_admin") return true;
      return perm === "search:global";
    }),
    resolveScopedInstitutionId: jest.fn(async (instId?: string | null) => instId || "global"),
  };
});

import { GET } from "../route";
import { GET as getSuggestions } from "../suggestions/route";

describe("Global Search Route & Suggestions API Handlers", () => {
  beforeEach(() => {
    mockSession = {
      staffId: "admin-search-tester",
      role: "admin",
      email: "admin.search@thaiba.com",
      employeeId: "EMP-ADM-TEST",
      name: "Admin Search Tester",
      tokenVersion: 0,
      institutionId: "inst-test",
    };
  });

  describe("GET /api/search", () => {
    it("returns 401 Unauthorized when no auth token is provided", async () => {
      mockSession = null;
      const request = new Request("http://localhost:3000/api/search?q=test");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 400 when search query contains invalid characters", async () => {
      const request = new Request("http://localhost:3000/api/search?q=<script>alert(1)</script>");
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("returns 200 with results and pagination metadata for a valid query", async () => {
      const request = new Request("http://localhost:3000/api/search?q=test&limit=10&page=1");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.page).toBe(1);
    });
  });

  describe("GET /api/search/suggestions", () => {
    it("returns 401 Unauthorized when no auth token is provided", async () => {
      mockSession = null;
      const request = new Request("http://localhost:3000/api/search/suggestions?q=test");
      const response = await getSuggestions(request);
      expect(response.status).toBe(401);
    });

    it("returns 200 with suggestions array for an authenticated request", async () => {
      const request = new Request("http://localhost:3000/api/search/suggestions?q=test");
      const response = await getSuggestions(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
