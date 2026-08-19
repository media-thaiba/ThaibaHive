import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../_components/latency-trend-chart", () => ({
  LatencyTrendChart: ({ routes, isLoading }: any) => (
    <div data-testid="latency-trend-chart">
      <h2>Latency Distribution by Top Endpoints</h2>
      <div>{isLoading ? "Loading chart..." : `Routes count: ${routes?.length || 0}`}</div>
    </div>
  ),
}));

import { LatencySummaryCards } from "../_components/latency-summary-cards";
import { RouteLatencyTable } from "../_components/route-latency-table";
import { LatencyTrendChart } from "../_components/latency-trend-chart";
import AdminObservabilityPage from "../page";
import type { ClusterMetricsSnapshot } from "@/lib/observability/sliding-window-aggregator";

const mockSnapshot: ClusterMetricsSnapshot = {
  window: "5m",
  timestamp: new Date().toISOString(),
  totalRequests: 120,
  totalErrors: 3,
  errorRate: 2.5,
  requestsPerMinute: 24,
  globalLatency: {
    count: 120,
    sum: 6000,
    min: 5.2,
    max: 420.0,
    mean: 50.0,
    p50: 35.0,
    p90: 85.0,
    p95: 140.0,
    p99: 280.0,
  },
  activeRoutesCount: 2,
  routes: [
    {
      route: "/api/students",
      method: "GET",
      totalRequests: 100,
      status2xx: 98,
      status3xx: 0,
      status4xx: 2,
      status5xx: 0,
      errorRate: 2.0,
      latency: {
        count: 100,
        sum: 4000,
        min: 5.2,
        max: 210.0,
        mean: 40.0,
        p50: 32.0,
        p90: 75.0,
        p95: 120.0,
        p99: 190.0,
      },
      lastActive: new Date().toISOString(),
    },
    {
      route: "/api/auth/login",
      method: "POST",
      totalRequests: 20,
      status2xx: 19,
      status3xx: 0,
      status4xx: 1,
      status5xx: 0,
      errorRate: 5.0,
      latency: {
        count: 20,
        sum: 2000,
        min: 40.0,
        max: 420.0,
        mean: 100.0,
        p50: 85.0,
        p90: 210.0,
        p95: 350.0,
        p99: 420.0,
      },
      lastActive: new Date().toISOString(),
    },
  ],
};

describe("Admin Observability Dashboard Components (APM-014 6-Scenario Coverage)", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSnapshot),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Scenario 1: Initial render / Skeleton loading state
  test("Scenario 1: renders skeleton loaders when in loading state", () => {
    const { container } = render(<LatencySummaryCards snapshot={null} isLoading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // Scenario 2: Successful render with loaded telemetry
  test("Scenario 2: renders LatencySummaryCards with metric values and SLA badges", () => {
    render(<LatencySummaryCards snapshot={mockSnapshot} isLoading={false} />);
    expect(screen.getByText("p50 Median")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText("p95 Tail Latency")).toBeInTheDocument();
    expect(screen.getByText("140")).toBeInTheDocument();
    expect(screen.getByText("SLA Met (<500ms)")).toBeInTheDocument();
    expect(screen.getByText("2.5%")).toBeInTheDocument();
  });

  // Scenario 3: Time window selector triggers refetch with parameter
  test("Scenario 3: changing time window selector triggers fetch with window query param", async () => {
    render(<AdminObservabilityPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const btn1h = screen.getByRole("button", { name: "1h" });
    fireEvent.click(btn1h);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/system/metrics?window=1h");
    });
  });

  // Scenario 4: Route filter search narrowing table results
  test("Scenario 4: searching in route filter narrows displayed table rows", () => {
    render(<RouteLatencyTable routes={mockSnapshot.routes} isLoading={false} />);
    expect(screen.getByText("/api/students")).toBeInTheDocument();
    expect(screen.getByText("/api/auth/login")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search API route...");
    fireEvent.change(searchInput, { target: { value: "login" } });

    expect(screen.queryByText("/api/students")).not.toBeInTheDocument();
    expect(screen.getByText("/api/auth/login")).toBeInTheDocument();
  });

  // Scenario 5: Pause and resume polling
  test("Scenario 5: clicking pause stops polling and toggles button label", async () => {
    render(<AdminObservabilityPage />);
    await waitFor(() => expect(screen.getByText("Production Latency Observability")).toBeInTheDocument());

    const pauseBtn = screen.getByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  // Scenario 6: API error state and manual retry
  test("Scenario 6: renders error alert on fetch failure and retries on refresh button", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network connection dropped"));
    render(<AdminObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Telemetry Connection Error")).toBeInTheDocument();
      expect(screen.getByText("Network connection dropped")).toBeInTheDocument();
    });

    // Mock successful retry
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSnapshot),
    });

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.queryByText("Telemetry Connection Error")).not.toBeInTheDocument();
    });
  });
});
