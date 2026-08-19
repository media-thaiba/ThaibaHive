import { EdgeCachePurger } from "../cache-purger";
import crypto from "crypto";

describe("EdgeCachePurger", () => {
  const secret = "test-edge-secret-key-12345";

  test("validates HMAC signatures correctly", () => {
    const rawBody = JSON.stringify({ tags: ["inst-101"] });
    const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(EdgeCachePurger.verifyHmacSignature(rawBody, hmac, secret)).toBe(true);
    expect(EdgeCachePurger.verifyHmacSignature(rawBody, "invalid-sig", secret)).toBe(false);
  });

  test("dispatches purge requests and records purge history", async () => {
    const purger = EdgeCachePurger.getInstance();
    const res = await purger.purge({ tags: ["inst-101", "media-99"], urls: ["/api/courses"] });

    expect(res.success).toBe(true);
    expect(res.purgedTags).toEqual(["inst-101", "media-99"]);
    expect(res.purgedUrls).toEqual(["/api/courses"]);

    const history = purger.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].purgedTags).toContain("inst-101");
  });
});
