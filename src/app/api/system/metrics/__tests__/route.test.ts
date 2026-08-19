import { GET } from "../route";
import { verifySession } from "@thaiba/auth";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
}));

describe("GET /api/system/metrics Route Tests", () => {
  beforeEach(() => {
    delete process.env.METRICS_SECRET;
    (verifySession as jest.Mock).mockReset();
    SlidingWindowAggregator.getInstance().reset();
  });

  test("rejects unauthenticated request with 401", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/system/metrics");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  test("rejects non-admin role with 403", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf_123",
      role: "staff",
      institutionId: "inst_1",
    });
    const req = new Request("http://localhost:3000/api/system/metrics");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  test("allows super_admin role and returns JSON metrics", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf_super",
      role: "super_admin",
      institutionId: "inst_1",
    });
    SlidingWindowAggregator.getInstance().recordRequest("/api/students", "GET", 200, 45);

    const req = new Request("http://localhost:3000/api/system/metrics?window=1m");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.window).toBe("1m");
    expect(body.totalRequests).toBe(1);
    expect(body.routes[0].route).toBe("/api/students");
  });

  test("allows bearer secret auth without session", async () => {
    process.env.METRICS_SECRET = "super_secret_apm_token_123";
    (verifySession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/system/metrics", {
      headers: {
        authorization: "Bearer super_secret_apm_token_123",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("returns Prometheus format when requested", async () => {
    process.env.METRICS_SECRET = "secret";
    SlidingWindowAggregator.getInstance().recordRequest("/api/students", "GET", 200, 30);

    const req = new Request("http://localhost:3000/api/system/metrics?format=prometheus", {
      headers: {
        "x-metrics-secret": "secret",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("thaibahive_http_requests_total");
  });
});
