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
        set: (key: string, value: string) => { h.set(key.toLowerCase(), value); },
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

    static redirect(url: string | URL) {
      const location = typeof url === "string" ? url : url.toString();
      const res = new MockNextResponse(null, { status: 307 });
      res._headers.set("location", location);
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

      const cookieStr = this._headers.get("cookie") || "";
      cookieStr.split(";").forEach((c) => {
        const [key, ...rest] = c.split("=");
        if (key) this._cookies.set(key.trim(), rest.join("=").trim());
      });
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

import { proxy, config } from "@/proxy";

function makeRequest(pathname: string, opts?: { cookie?: string; authorization?: string; method?: string; contentType?: string; contentLength?: string }) {
  const url = `http://localhost${pathname}`;
  const headers: Record<string, string> = {};
  if (opts?.cookie) headers["cookie"] = opts.cookie;
  if (opts?.authorization) headers["authorization"] = opts.authorization;
  if (opts?.contentType) headers["content-type"] = opts.contentType;
  if (opts?.contentLength) headers["content-length"] = opts.contentLength;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest(url, { method: opts?.method || "GET", headers });
}

describe("proxy", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("public paths", () => {
    const publicPaths = [
      "/auth/login",
      "/auth/signup",
      "/api/auth/login",
      "/api/auth/signup",
      "/api/auth/google",
      "/api/auth/mobile-handoff",
    ];

    it.each(publicPaths)("should pass through %s without authentication", (path) => {
      const req = makeRequest(path);
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });
  });

  describe("blocked scanner paths", () => {
    const blockedPaths = [
      "/.env",
      "/.env.local",
      "/wp-admin",
      "/wp-login.php",
      "/xmlrpc.php",
      "/.git/config",
      "/phpmyadmin",
    ];

    it.each(blockedPaths)("should block %s with 404", (path) => {
      const req = makeRequest(path);
      const res = proxy(req as any);
      expect(res.status).toBe(404);
    });
  });

  describe("unauthenticated requests", () => {
    it("should redirect page requests to /auth/login", () => {
      const req = makeRequest("/leaves");
      const res = proxy(req as any) as any;
      expect(res.status).toBe(307);
      expect(res.get("location")).toBe("http://localhost/auth/login");
    });

    it("should return 401 JSON for API requests", () => {
      const req = makeRequest("/api/dashboard/stats");
      const res = proxy(req as any) as any;
      expect(res.status).toBe(401);
    });
  });

  describe("cookie authentication", () => {
    it("should pass through with valid thaibahive_session cookie", () => {
      const req = makeRequest("/leaves", { cookie: "thaibahive_session=some.jwt.token" });
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });
  });

  describe("bearer token authentication", () => {
    it("should pass through with valid Bearer token", () => {
      const req = makeRequest("/leaves", { authorization: "Bearer some.jwt.token" });
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });
  });

  describe("write request body size limit", () => {
    it("should reject POST requests exceeding 5MB", () => {
      const size = 5 * 1024 * 1024 + 1;
      const req = makeRequest("/api/tasks", {
        method: "POST",
        cookie: "thaibahive_session=token",
        contentType: "application/json",
        contentLength: String(size),
      });
      const res = proxy(req as any);
      expect(res.status).toBe(413);
    });

    it("should reject PUT requests exceeding 5MB", () => {
      const size = 10 * 1024 * 1024;
      const req = makeRequest("/api/tasks/1", {
        method: "PUT",
        cookie: "thaibahive_session=token",
        contentType: "application/json",
        contentLength: String(size),
      });
      const res = proxy(req as any);
      expect(res.status).toBe(413);
    });

    it("should allow POST requests under 5MB", () => {
      const req = makeRequest("/api/tasks", {
        method: "POST",
        cookie: "thaibahive_session=token",
        contentType: "application/json",
        contentLength: String(1024),
      });
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });
  });

  describe("content type validation on write routes", () => {
    it("should reject non-JSON/non-multipart content types on POST", () => {
      const req = makeRequest("/api/tasks", {
        method: "POST",
        cookie: "thaibahive_session=token",
        contentType: "text/plain",
      });
      const res = proxy(req as any);
      expect(res.status).toBe(415);
    });

    it("should allow application/json content type on POST", () => {
      const req = makeRequest("/api/tasks", {
        method: "POST",
        cookie: "thaibahive_session=token",
        contentType: "application/json",
      });
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });

    it("should allow multipart/form-data content type on POST", () => {
      const req = makeRequest("/api/tasks", {
        method: "POST",
        cookie: "thaibahive_session=token",
        contentType: "multipart/form-data",
      });
      const res = proxy(req as any);
      expect(res.status).toBe(200);
    });
  });

  describe("security headers", () => {
    it("should add security headers to responses", () => {
      const req = makeRequest("/auth/login");
      const res = proxy(req as any) as any;
      expect(res.get("x-content-type-options")).toBe("nosniff");
      expect(res.get("x-frame-options")).toBe("DENY");
      expect(res.get("x-xss-protection")).toBe("1; mode=block");
      expect(res.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(res.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=()");
    });

    it("should add no-store cache headers for API routes", () => {
      const req = makeRequest("/api/auth/login");
      const res = proxy(req as any) as any;
      expect(res.get("cache-control")).toBe("no-store, no-cache, must-revalidate");
    });
  });

  describe("config.matcher", () => {
    it("should export a matcher config", () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher.length).toBeGreaterThan(0);
    });

    it("should exclude _next/static from matcher", () => {
      expect(config.matcher[0]).toContain("_next/static");
    });

    it("should exclude manifest.json from matcher", () => {
      expect(config.matcher[0]).toContain("manifest.json");
    });

    it("should exclude sw.js from matcher", () => {
      expect(config.matcher[0]).toContain("sw.js");
    });

    it("should exclude offline.html from matcher", () => {
      expect(config.matcher[0]).toContain("offline.html");
    });

    it("should exclude .svg files from matcher", () => {
      expect(config.matcher[0]).toContain("\\.svg$");
    });
  });
});
