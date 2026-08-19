import { getMediaEdgeHeaders } from "../edge-optimizer";

describe("MediaEdgeOptimizer", () => {
  test("generates CDN caching headers for public media items", () => {
    const headers = getMediaEdgeHeaders({
      id: "photo-12345",
      isPublic: true,
      institutionId: "inst-99",
    });

    expect(headers["Cache-Control"]).toContain("public");
    expect(headers["Cache-Control"]).toContain("max-age=604800");
    expect(headers["Surrogate-Key"]).toContain("media-photo-12345");
    expect(headers["Surrogate-Key"]).toContain("inst-99");
    expect(headers["Vary"]).toContain("Accept");
  });

  test("returns private no-cache headers for non-public media items", () => {
    const headers = getMediaEdgeHeaders({
      id: "doc-secret",
      isPublic: false,
    });

    expect(headers["Cache-Control"]).toBe("no-store, no-cache, must-revalidate");
    expect(headers["CDN-Cache-Control"]).toBe("no-store");
  });
});
