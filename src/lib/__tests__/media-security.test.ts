import { proxy as middleware } from "@/middleware";

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

    static json(data: any, init?: any) {
      return new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
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

    constructor(input: string, init?: any) {
      const parsed = new URL(input);
      this.url = input;
      this.nextUrl = { pathname: parsed.pathname, origin: parsed.origin };
      this.method = init?.method || "GET";
      this._headers = new Map<string, string>();
      this._cookies = new Map<string, string>();

      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) =>
          this._headers.set(k.toLowerCase(), String(v))
        );
      }

      if (init?.cookies) {
        Object.entries(init.cookies).forEach(([k, v]) =>
          this._cookies.set(k, String(v))
        );
      }
    }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key.toLowerCase()) ?? null,
      };
    }

    get cookies() {
      return {
        get: (name: string) => {
          const val = this._cookies.get(name);
          return val ? { name, value: val } : undefined;
        },
      };
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  };
});

describe("MediaHive Security & Permission Controls (MH-012 & MH-013)", () => {
  it("should enforce security headers on media API responses", () => {
    const req = new (require("next/server").NextRequest)(
      "http://localhost:3000/api/media/assets",
      { cookies: { thaibahive_session: "valid-jwt-token" } }
    );
    const res = middleware(req as any);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
  });

  it("should redirect unauthenticated requests to login for shell media routes", () => {
    const req = new (require("next/server").NextRequest)(
      "http://localhost:3000/media-library"
    );
    const res = middleware(req as any);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("should return 401 Unauthorized for unauthenticated API requests", () => {
    const req = new (require("next/server").NextRequest)(
      "http://localhost:3000/api/media/assets"
    );
    const res = middleware(req as any);

    expect(res.status).toBe(401);
  });

  it("should allow public access for share link routes", () => {
    const req = new (require("next/server").NextRequest)(
      "http://localhost:3000/api/media/share-links/public-token-123"
    );
    const res = middleware(req as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307);
  });

  it("should reject payload larger than max limit on write API routes", () => {
    const req = new (require("next/server").NextRequest)(
      "http://localhost:3000/api/media/assets",
      {
        method: "POST",
        cookies: { thaibahive_session: "valid-token" },
        headers: { "content-length": String(60 * 1024 * 1024) }, // 60MB
      }
    );
    const res = middleware(req as any);

    expect(res.status).toBe(413);
  });
});
