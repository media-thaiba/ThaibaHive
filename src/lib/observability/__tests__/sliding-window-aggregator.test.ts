import { SlidingWindowAggregator } from "../sliding-window-aggregator";

describe("SlidingWindowAggregator Unit Tests", () => {
  let aggregator: SlidingWindowAggregator;

  beforeEach(() => {
    aggregator = SlidingWindowAggregator.getInstance();
    aggregator.reset();
  });

  afterAll(() => {
    aggregator.destroy();
  });

  test("records request metrics across routes and status codes", () => {
    aggregator.recordRequest("/api/students", "GET", 200, 45.2);
    aggregator.recordRequest("/api/students", "GET", 200, 52.8);
    aggregator.recordRequest("/api/students", "POST", 201, 110.0);
    aggregator.recordRequest("/api/students", "GET", 500, 320.0);
    aggregator.recordRequest("/api/auth/login", "POST", 401, 25.0);

    const snap = aggregator.getMetricsSnapshot("5m");
    expect(snap.totalRequests).toBe(5);
    expect(snap.totalErrors).toBe(2); // 1x 500 + 1x 401
    expect(snap.errorRate).toBe(40);
    expect(snap.activeRoutesCount).toBe(3); // GET /api/students, POST /api/students, POST /api/auth/login

    const getStudents = snap.routes.find((r) => r.route === "/api/students" && r.method === "GET");
    expect(getStudents).toBeDefined();
    expect(getStudents?.totalRequests).toBe(3);
    expect(getStudents?.status2xx).toBe(2);
    expect(getStudents?.status5xx).toBe(1);
    expect(getStudents?.errorRate).toBeCloseTo(33.33, 1);
    expect(getStudents?.latency.p50).toBeDefined();
  });

  test("provides different metrics across time windows", () => {
    aggregator.recordRequest("/api/health", "GET", 200, 5);
    const snap1m = aggregator.getMetricsSnapshot("1m");
    const snap1h = aggregator.getMetricsSnapshot("1h");

    expect(snap1m.window).toBe("1m");
    expect(snap1h.window).toBe("1h");
    expect(snap1m.totalRequests).toBe(1);
    expect(snap1h.totalRequests).toBe(1);
  });

  test("enforces LRU route eviction when exceeding maxRoutes limit", () => {
    // Fill with 260 distinct routes
    for (let i = 0; i < 260; i++) {
      aggregator.recordRequest(`/api/route-${i}`, "GET", 200, 10 + (i % 50));
    }

    const snap = aggregator.getMetricsSnapshot("5m");
    expect(snap.activeRoutesCount).toBeLessThanOrEqual(250);
  });

  test("cleans up on reset", () => {
    aggregator.recordRequest("/api/test", "GET", 200, 15);
    expect(aggregator.getMetricsSnapshot("5m").totalRequests).toBe(1);

    aggregator.reset();
    expect(aggregator.getMetricsSnapshot("5m").totalRequests).toBe(0);
  });
});
