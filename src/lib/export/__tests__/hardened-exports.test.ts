import { GET } from "@/app/api/export/route";
import { sanitizeCsvValue } from "../csv-formatter";
import { verifySession, hasPermission } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Hardened Enterprise Multi-Format Export Engine", () => {
  const superAdminSession = {
    staffId: "admin-exp-01",
    role: "super_admin",
    employeeId: "SA001",
    email: "superadmin@thaiba.local",
    tokenVersion: 0,
    institutionScope: [],
  };

  beforeEach(() => {
    (verifySession as jest.Mock).mockResolvedValue(superAdminSession);
  });

  describe("CSV Formula Injection Protection", () => {
    it("should sanitize formula injection triggers", () => {
      expect(sanitizeCsvValue("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvValue("+12345")).toBe("'+12345");
      expect(sanitizeCsvValue("-500")).toBe("'-500");
      expect(sanitizeCsvValue("@malicious_cmd")).toBe("'@malicious_cmd");
      expect(sanitizeCsvValue("Standard Text")).toBe("Standard Text");
    });
  });

  describe("Format Generation across Multiple Domains", () => {
    const domains = ["attendance", "fees", "purchases", "students", "timetables"] as const;

    domains.forEach((domain) => {
      it(`should generate valid CSV export for ${domain}`, async () => {
        const req = new Request(`http://localhost:3000/api/export?type=${domain}&format=csv`);
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/csv");
        const body = await res.text();
        expect(body).toBeDefined();
        // Starts with UTF-8 BOM
        expect(body.charCodeAt(0)).toBe(0xfeff);
      });

      it(`should generate valid XLSX export for ${domain}`, async () => {
        const req = new Request(`http://localhost:3000/api/export?type=${domain}&format=xlsx`);
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("spreadsheet");
        const text = await res.text();
        expect(text.length).toBeGreaterThan(50);
      });

      it(`should generate valid PDF export for ${domain}`, async () => {
        const req = new Request(`http://localhost:3000/api/export?type=${domain}&format=pdf`);
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/pdf");
        const text = await res.text();
        expect(text.length).toBeGreaterThan(100);
      });
    });
  });

  describe("RBAC & Security Guarding", () => {
    it("should reject requests from unauthorized staff without permissions", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: "unauthorized-staff-01",
        role: "guest",
        email: "guest@external.local",
      });
      (hasPermission as jest.Mock).mockReturnValue(false);

      const req = new Request("http://localhost:3000/api/export?type=fees&format=csv");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });
  });
});
