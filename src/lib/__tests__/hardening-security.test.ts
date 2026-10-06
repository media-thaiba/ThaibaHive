import { GET as getSystemUpdate } from "@/app/api/system/update/route";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      staffId: "staff_admin",
      email: "admin@thaiba.edu",
      role: "super_admin",
      institutionId: "inst_test",
    }),
    hasPermission: jest.fn(() => true),
  };
});

describe("Hardening & Security Sanitization (Task A5 / Important I1, I3, I4)", () => {
  const originalEnv = process.env;

  beforeAll(async () => {
    try {
      await db.insert(systemConfigs).values([
        { key: "app_latest_version", value: "3.20.0" },
        { key: "app_download_url", value: "/downloads/app.apk" },
      ]).onConflictDoUpdate({
        target: systemConfigs.key,
        set: { value: "/downloads/app.apk" },
      }).run();
    } catch {}
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("System Update Origin Security", () => {
    it("should construct download URL using NEXT_PUBLIC_APP_URL rather than untrusted host header", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://trusted-domain.thaiba.edu";

      const req = new Request("http://localhost/api/system/update", {
        headers: {
          host: "attacker-controlled-host.com",
          "x-forwarded-proto": "http",
        },
      });

      const res = await getSystemUpdate(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.downloadUrl).toContain("https://trusted-domain.thaiba.edu/downloads/");
      expect(json.downloadUrl).not.toContain("attacker-controlled-host.com");
    });
  });

  describe("Streaming Request Body Limits (Task A5 / Important I3)", () => {
    it("should accept stream within bounded byte threshold", async () => {
      const { readBoundedRequestBody } = await import("@/lib/api/streaming-limit");
      const sampleData = new Uint8Array([1, 2, 3, 4, 5]);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(sampleData);
          controller.close();
        },
      });

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: stream,
        duplex: "half",
      } as any);

      const result = await readBoundedRequestBody(req, 10);
      expect(result.byteLength).toBe(5);
    });

    it("should abort stream with PayloadTooLargeError when stream exceeds limit without Content-Length", async () => {
      const { readBoundedRequestBody, PayloadTooLargeError } = await import("@/lib/api/streaming-limit");
      const sampleData = new Uint8Array(20).fill(1);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(sampleData);
          controller.close();
        },
      });

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: stream,
        duplex: "half",
      } as any);

      // Max allowed: 10 bytes, payload: 20 bytes
      await expect(readBoundedRequestBody(req, 10)).rejects.toThrow(PayloadTooLargeError);
    });

    it("should return 413 when uploaded file exceeds 4.5MB serverless limit", async () => {
      const { POST: uploadHandler } = await import("@/app/api/upload/route");

      const req = {
        url: "http://localhost/api/upload",
        method: "POST",
        headers: new Headers(),
        formData: async () => ({
          get: (key: string) =>
            key === "file"
              ? {
                  size: 5 * 1024 * 1024,
                  type: "application/pdf",
                  name: "large-document.pdf",
                }
              : null,
        }),
      } as unknown as Request;

      const res = await uploadHandler(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toContain("exceeds 4.5 MB serverless proxy limit");
    });
  });
});
