import {
  broadcastDashboardEvent,
  broadcastInstitutionEvent,
  connectionCount,
} from "@/lib/api/realtime";

describe("Realtime SSE Event Emitter Unit Tests", () => {
  it("connectionCount returns 0 for unestablished connection keys", () => {
    expect(connectionCount("notification-nonexistent-staff-id")).toBe(0);
  });

  it("broadcastDashboardEvent executes safely when no client is connected", () => {
    expect(() => {
      broadcastDashboardEvent("staff-test-id", "task_assigned", {
        id: "task-1",
        title: "Test Task",
      });
    }).not.toThrow();
  });

  it("broadcastInstitutionEvent executes safely across subscriber maps", () => {
    expect(() => {
      broadcastInstitutionEvent("inst-1", "announcement_published", {
        id: "ann-1",
        title: "Test Announcement",
      });
    }).not.toThrow();
  });
});
