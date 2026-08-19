jest.mock("next/server", () => {
  class MockNextResponse {
    public status: number;
    public _headers: Map<string, string>;

    constructor(body?: any, init?: any) {
      this.status = init?.status ?? 200;
      this._headers = new Map<string, string>();
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        Object.entries(h).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
      }
    }

    get headers() {
      const h = this._headers;
      return {
        set: (key: string, value: string) => {
          h.set(key.toLowerCase(), value);
        },
        get: (key: string) => h.get(key.toLowerCase()) ?? null,
      };
    }

    get(key: string) {
      return this._headers.get(key.toLowerCase()) ?? null;
    }

    static json(data: any, init?: any) {
      const res = new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
      return res;
    }

    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }

  class MockNextRequest {
    public method: string;
    public url: string;
    public nextUrl: { pathname: string; origin: string };
    private _headers: Map<string, string>;
    private _cookies: Map<string, string>;

    constructor(input: string | Request, init?: any) {
      const urlStr = typeof input === "string" ? input : (input as any).url ?? "";
      const parsed = new URL(urlStr);
      this.url = urlStr;
      this.nextUrl = { pathname: parsed.pathname, origin: parsed.origin };
      this.method = init?.method || "GET";
      this._headers = new Map<string, string>();
      this._cookies = new Map<string, string>();

      if (init?.headers) {
        const h = init.headers;
        if (h instanceof Map) {
          h.forEach((v: any, k: any) => this._headers.set(String(k).toLowerCase(), String(v)));
        } else {
          Object.entries(h).forEach(([k, v]) => this._headers.set(k.toLowerCase(), String(v)));
        }
      }
    }

    get cookies() {
      return {
        get: (name: string) => {
          const value = this._cookies.get(name);
          return value ? { value } : undefined;
        },
      };
    }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key.toLowerCase()) ?? null,
      };
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  };
});

import { NextRequest, NextResponse } from "next/server";
import { startApmTracking, completeApmTracking } from "../middleware/apm-telemetry";
import { SlidingWindowAggregator } from "../observability/sliding-window-aggregator";
import { proxy } from "../../middleware";
import { requireAuth } from "../api/auth-guard";

jest.mock("../../../packages/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({ staffId: "usr_123", role: "admin", institutionId: "inst_1" }),
  hasPermission: jest.fn().mockReturnValue(true),
}));

describe("APM Middleware & Telemetry Tests", () => {
  beforeEach(() => {
    delete process.env.APM_TELEMETRY_ENABLED;
    SlidingWindowAggregator.getInstance().reset();
  });

  afterAll(() => {
    delete process.env.APM_TELEMETRY_ENABLED;
  });

  test("injects x-response-time header in Edge middleware", () => {
    const req = new NextRequest("http://localhost:3000/api/students");
    const ctx = startApmTracking(req);
    const initialRes = NextResponse.json({ ok: true }, { status: 200 });

    const finalRes = completeApmTracking(ctx, initialRes);
    const responseTimeHeader = finalRes.headers.get("x-response-time");

    expect(responseTimeHeader).toBeDefined();
    expect(responseTimeHeader).toMatch(/^\d+(\.\d+)?ms$/);
  });

  test("respects APM_TELEMETRY_ENABLED=false kill switch in middleware", () => {
    process.env.APM_TELEMETRY_ENABLED = "false";
    const req = new NextRequest("http://localhost:3000/api/students");
    const ctx = startApmTracking(req);
    const initialRes = NextResponse.json({ ok: true });

    const finalRes = completeApmTracking(ctx, initialRes);
    expect(finalRes.headers.get("x-response-time")).toBeNull();
  });

  test("records telemetry in Node runtime via requireAuth", async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }, { status: 200 }));
    const wrapped = requireAuth(handler);

    const req = new Request("http://localhost:3000/api/students/cm7abc123/profile", { method: "GET" });
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    const snapshot = SlidingWindowAggregator.getInstance().getMetricsSnapshot("5m");
    expect(snapshot.totalRequests).toBe(1);
    expect(snapshot.routes[0].route).toBe("/api/students/:id/profile");
    expect(snapshot.routes[0].status2xx).toBe(1);
  });

  test("records 401 unauthorized in Node runtime when session is missing", async () => {
    const { verifySession } = require("../../../packages/auth");
    (verifySession as jest.Mock).mockResolvedValueOnce(null);

    const handler = jest.fn();
    const wrapped = requireAuth(handler);

    const req = new Request("http://localhost:3000/api/attendance/logs", { method: "GET" });
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const snapshot = SlidingWindowAggregator.getInstance().getMetricsSnapshot("5m");
    expect(snapshot.totalErrors).toBe(1);
    expect(snapshot.routes[0].status4xx).toBe(1);
  });

  test("handles middleware proxy end-to-end for public route", () => {
    const req = new NextRequest("http://localhost:3000/api/system/health");
    const res = proxy(req);

    expect(res.headers.get("x-response-time")).toBeDefined();
    expect(res.headers.get("x-request-id")).toBeDefined();
  });
});
