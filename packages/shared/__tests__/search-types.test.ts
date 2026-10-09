import {
  SEARCHABLE_ENTITY_TYPES,
  ENTITY_ROUTE_STRATEGY_MAP,
  type EntityType,
} from "../src/search-types";

describe("Shared Search Types & Cross-Platform Parity Contract", () => {
  it("defines exactly 15 searchable entity types", () => {
    expect(SEARCHABLE_ENTITY_TYPES).toHaveLength(15);
    expect(SEARCHABLE_ENTITY_TYPES).toEqual([
      "students",
      "staff",
      "tasks",
      "events",
      "announcements",
      "daily-reports",
      "purchase-requests",
      "help-desk-tickets",
      "recognition",
      "asset-inventory",
      "circulars",
      "bookings",
      "polls",
      "comments",
      "media-assets",
    ]);
  });

  it("maps every searchable entity type to a routing strategy", () => {
    for (const entityType of SEARCHABLE_ENTITY_TYPES) {
      expect(ENTITY_ROUTE_STRATEGY_MAP[entityType]).toBeDefined();
      expect(["native", "handoff"]).toContain(ENTITY_ROUTE_STRATEGY_MAP[entityType]);
    }
  });

  it("routes purchase-requests to handoff and others to native", () => {
    expect(ENTITY_ROUTE_STRATEGY_MAP["purchase-requests"]).toBe("handoff");
    expect(ENTITY_ROUTE_STRATEGY_MAP["tasks"]).toBe("native");
    expect(ENTITY_ROUTE_STRATEGY_MAP["students"]).toBe("native");
    expect(ENTITY_ROUTE_STRATEGY_MAP["staff"]).toBe("native");
  });
});
