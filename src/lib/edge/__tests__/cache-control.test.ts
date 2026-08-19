import { getEdgeCacheHeaders, applyEdgeCaching, isEdgeCachingEnabled } from "../cache-control";

describe("EdgeCacheControl", () => {
  test("returns private no-store headers for PRIVATE_DYNAMIC policy", () => {
    const headers = getEdgeCacheHeaders("PRIVATE_DYNAMIC");
    expect(headers["Cache-Control"]).toBe("no-store, no-cache, must-revalidate");
    expect(headers["CDN-Cache-Control"]).toBe("no-store");
  });

  test("generates public immutable headers with surrogate tags", () => {
    const headers = getEdgeCacheHeaders("PUBLIC_IMMUTABLE", { tags: ["static-assets", "v3.18"] });
    expect(headers["Cache-Control"]).toContain("public");
    expect(headers["Cache-Control"]).toContain("immutable");
    expect(headers["Surrogate-Key"]).toBe("static-assets v3.18");
  });

  test("generates public semi-static headers with s-maxage and SWR", () => {
    const headers = getEdgeCacheHeaders("PUBLIC_SEMI_STATIC", {
      maxAgeSeconds: 120,
      swrSeconds: 600,
      tags: ["inst-101"],
    });
    expect(headers["Cache-Control"]).toBe("public, s-maxage=120, stale-while-revalidate=600");
    expect(headers["Surrogate-Key"]).toBe("inst-101");
    expect(headers["Vary"]).toContain("Accept");
  });

  test("applies headers to response object with Headers set method", () => {
    const headersMap = new Map<string, string>();
    const mockRes = {
      headers: {
        set: (k: string, v: string) => headersMap.set(k, v),
        get: (k: string) => headersMap.get(k),
      },
    };
    applyEdgeCaching(mockRes, "PUBLIC_SEMI_STATIC", { tags: ["dept-cs"] });
    expect(mockRes.headers.get("Cache-Control")).toContain("public");
    expect(mockRes.headers.get("Surrogate-Key")).toBe("dept-cs");
  });
});
