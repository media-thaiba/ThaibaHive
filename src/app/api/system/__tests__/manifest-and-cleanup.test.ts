import { GET as handleAasa } from "@/app/.well-known/apple-app-site-association/route";
import { GET as handleAssetLinks } from "@/app/.well-known/assetlinks.json/route";
import { POST as handleCleanupNonces } from "@/app/api/system/cleanup-nonces/route";
import { db } from "@/db";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("Universal Link Manifests & System Nonce Cleanup", () => {
  const origCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = origCronSecret;
  });

  describe("apple-app-site-association", () => {
    it("returns valid Apple Universal Links manifest with canonical workspace routes", async () => {
      const response = await handleAasa();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await response.json();
      expect(body.applinks).toBeDefined();
      expect(body.applinks.details[0].appID).toBe("TEAMID1234.com.thaiba.thaibahive");
      expect(body.applinks.details[0].paths).toEqual(
        expect.arrayContaining([
          "/my-work/*",
          "/operations/*",
          "/school/*",
          "/admin/*",
          "/sync-status",
          "/",
        ])
      );
      expect(body.webcredentials).toBeDefined();
    });
  });

  describe("assetlinks.json", () => {
    it("returns valid Android App Links manifest", async () => {
      const response = await handleAssetLinks();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].target.package_name).toBe("com.thaiba.thaibahive");
      expect(body[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/system/cleanup-nonces", () => {
    it("deletes expired nonces and returns deleted count", async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            all: jest.fn(async () => [{ jti: "nonce_1" }, { jti: "nonce_2" }]),
          }),
        }),
      });

      (db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          run: jest.fn(async () => ({ changes: 2 })),
        }),
      });

      const request = new Request("http://localhost:3000/api/system/cleanup-nonces", {
        method: "POST",
        headers: {
          "x-cron-secret": "test-cron-secret",
        },
      });

      // Note: requireAuth is tested with mock session or when invoked
      const response = await handleCleanupNonces(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.deleted).toBe(2);
      expect(data.ranAt).toBeDefined();
    });
  });
});
