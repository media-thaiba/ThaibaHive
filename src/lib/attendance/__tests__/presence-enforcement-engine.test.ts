import {
  evaluatePresence,
  decidePresence,
  resolvePresenceSettings,
  enforcePresence,
  PRESENCE_DEFAULT_SETTINGS,
  type GeofenceLocationInput,
  type ResolvedPresenceSettings,
} from "@/lib/attendance/presence-enforcement-engine";

jest.mock("@/db", () => {
  const state: { settingsRow: unknown; locations: unknown[]; throwOnSelect: boolean } = {
    settingsRow: null,
    locations: [],
    throwOnSelect: false,
  };
  return {
    // Settings queries use .get() (limit/where chains); location queries use .all().
    db: {
      select: jest.fn(() => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              get: () => {
                if (state.throwOnSelect) throw new Error("db_unavailable");
                return Promise.resolve(state.settingsRow);
              },
              all: () => {
                if (state.throwOnSelect) throw new Error("db_unavailable");
                return Promise.resolve(state.locations);
              },
            }),
            get: () => {
              if (state.throwOnSelect) throw new Error("db_unavailable");
              return Promise.resolve(state.settingsRow);
            },
            all: () => {
              if (state.throwOnSelect) throw new Error("db_unavailable");
              return Promise.resolve(state.locations);
            },
          }),
        }),
      })),
    },
    __setSettingsRow(row: unknown) {
      state.settingsRow = row;
    },
    __setLocations(locs: unknown[]) {
      state.locations = locs;
    },
    __setThrow(v: boolean) {
      state.throwOnSelect = v;
    },
  };
});

const { __setSettingsRow, __setLocations, __setThrow } = jest.requireMock("@/db");

const settings: ResolvedPresenceSettings = {
  ...PRESENCE_DEFAULT_SETTINGS,
  source: "defaults",
};

const location: GeofenceLocationInput = {
  id: "loc-1",
  latitude: 12.9716,
  longitude: 77.5946,
  radius: 150,
  wifiSsids: "Campus-WiFi,Staff-Net",
};

describe("evaluatePresence (server-side recompute)", () => {
  it("verifies coordinates inside the geofence radius", () => {
    const result = evaluatePresence(
      { latitude: 12.9716, longitude: 77.5947, accuracy: 10 },
      [location],
      settings
    );
    expect(result.withinGeofence).toBe(true);
    expect(result.matchedLocationId).toBe("loc-1");
    expect(result.mockSuspected).toBe(false);
  });

  it("marks coordinates outside every radius as outside, ignoring client claim of inside", () => {
    const result = evaluatePresence(
      {
        latitude: 13.05,
        longitude: 77.6,
        accuracy: 10,
        isWithinGeofence: true, // client lie — must be discarded
        distanceFromOffice: 5, // client lie — must be discarded
      },
      [location],
      settings
    );
    expect(result.withinGeofence).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(150);
  });

  it("honors client mock claim (self-incriminating)", () => {
    const result = evaluatePresence(
      { latitude: 12.9716, longitude: 77.5946, isMockLocation: true },
      [location],
      settings
    );
    expect(result.mockSuspected).toBe(true);
    expect(result.mockReasons).toContain("client_declared_mock");
  });

  it("flags null-island coordinates as mock", () => {
    const result = evaluatePresence(
      { latitude: 0, longitude: 0, accuracy: 20 },
      [location],
      settings
    );
    expect(result.mockSuspected).toBe(true);
    expect(result.mockReasons).toContain("null_island_coordinates");
  });

  it("flags non-positive accuracy as mock", () => {
    const result = evaluatePresence(
      { latitude: 12.9716, longitude: 77.5946, accuracy: 0 },
      [location],
      settings
    );
    expect(result.mockSuspected).toBe(true);
    expect(result.mockReasons).toContain("non_positive_accuracy");
  });

  it("does not flag a plausible reading as mock", () => {
    const result = evaluatePresence(
      { latitude: 12.9716, longitude: 77.5946, accuracy: 25, isMockLocation: false },
      [location],
      settings
    );
    expect(result.mockSuspected).toBe(false);
  });

  it("returns unknown verdict without coordinates", () => {
    const result = evaluatePresence({}, [location], settings);
    expect(result.withinGeofence).toBeNull();
    expect(result.unverifiableReasons).toContain("missing_coordinates");
    expect(result.geofenceConfigured).toBe(true);
  });

  it("falls back to WiFi match when coordinates are missing", () => {
    const result = evaluatePresence(
      { wifiSsid: "campus-wifi" },
      [location],
      settings
    );
    expect(result.wifiMatchedLocationId).toBe("loc-1");
    expect(result.withinGeofence).toBeNull();
  });

  it("rejects an inside reading whose accuracy exceeds the radius", () => {
    const result = evaluatePresence(
      { latitude: 12.9716, longitude: 77.5946, accuracy: 900 },
      [location],
      settings
    );
    expect(result.withinGeofence).toBe(false);
    expect(result.unverifiableReasons).toContain("accuracy_exceeds_geofence_radius");
  });

  it("uses location radius over the settings default radius", () => {
    const wide: GeofenceLocationInput = { ...location, radius: 5000 };
    // ~450m away: outside default 150m but inside location's 5000m
    const result = evaluatePresence(
      { latitude: 12.9756, longitude: 77.5946, accuracy: 30 },
      [wide],
      settings
    );
    expect(result.withinGeofence).toBe(true);
    expect(result.effectiveRadiusMeters).toBe(5000);
  });

  it("reports geofenceConfigured=false when no locations exist", () => {
    const result = evaluatePresence({ latitude: 12.9, longitude: 77.5 }, [], settings);
    expect(result.geofenceConfigured).toBe(false);
    expect(result.withinGeofence).toBeNull();
  });
});

describe("decidePresence (status + enforceability)", () => {
  const inside = evaluatePresence(
    { latitude: 12.9716, longitude: 77.5946, accuracy: 10 },
    [location],
    settings
  );
  const outside = evaluatePresence(
    { latitude: 13.05, longitude: 77.6, accuracy: 10 },
    [location],
    settings
  );
  const mock = evaluatePresence(
    { latitude: 12.9716, longitude: 77.5946, isMockLocation: true },
    [location],
    settings
  );
  const noCoords = evaluatePresence({}, [location], settings);
  const noCoordsWifi = evaluatePresence({ wifiSsid: "Staff-Net" }, [location], settings);
  const noGeofence = evaluatePresence({ latitude: 12.9, longitude: 77.5 }, [], settings);

  it("returns verified + no enforcement when verification is disabled", () => {
    const disabled = { ...settings, isEnabled: false };
    expect(decidePresence(mock, disabled, true)).toEqual({
      presenceStatus: "verified",
      enforceable: false,
      violationsIncrement: false,
    });
    expect(decidePresence(outside, disabled, true).presenceStatus).toBe("verified");
  });

  it("mock detection yields unverified with violation", () => {
    const d = decidePresence(mock, settings, true);
    expect(d.presenceStatus).toBe("unverified");
    expect(d.violationsIncrement).toBe(true);
  });

  it("outside geofence yields field_work with violation", () => {
    const d = decidePresence(outside, settings, true);
    expect(d.presenceStatus).toBe("field_work");
    expect(d.violationsIncrement).toBe(true);
  });

  it("inside geofence yields verified without violation", () => {
    const d = decidePresence(inside, settings, true);
    expect(d.presenceStatus).toBe("verified");
    expect(d.violationsIncrement).toBe(false);
  });

  it("fails closed to unverified when coordinates missing but geofence configured", () => {
    const d = decidePresence(noCoords, settings, true);
    expect(d.presenceStatus).toBe("unverified");
    expect(d.violationsIncrement).toBe(true);
  });

  it("accepts WiFi match when coordinates are missing", () => {
    const d = decidePresence(noCoordsWifi, settings, true);
    expect(d.presenceStatus).toBe("verified");
    expect(d.violationsIncrement).toBe(false);
  });

  it("does not penalize when no geofence is configured", () => {
    const d = decidePresence(noGeofence, settings, true);
    expect(d.presenceStatus).toBe("verified");
    expect(d.violationsIncrement).toBe(false);
    expect(d.enforceable).toBe(false);
  });

  it("shadow mode suppresses hard enforcement", () => {
    expect(decidePresence(outside, settings, true).enforceable).toBe(false);
    const live = { ...settings, shadowMode: false };
    expect(decidePresence(outside, live, true).enforceable).toBe(true);
  });

  it("feature flag off suppresses hard enforcement", () => {
    const live = { ...settings, shadowMode: false };
    expect(decidePresence(outside, live, false).enforceable).toBe(false);
    expect(decidePresence(outside, live, false).presenceStatus).toBe("field_work");
  });
});

describe("resolvePresenceSettings", () => {
  beforeEach(() => {
    __setSettingsRow(null);
    __setThrow(false);
  });

  it("falls back to defaults when no rows exist", async () => {
    const resolved = await resolvePresenceSettings(null);
    expect(resolved.source).toBe("defaults");
    expect(resolved.shadowMode).toBe(true);
    expect(resolved.geofenceRadiusMeters).toBe(150);
  });

  it("uses the institution row when present", async () => {
    __setSettingsRow({
      isEnabled: true,
      shadowMode: false,
      checkIntervalMinutes: 5,
      gracePeriodMinutes: 2,
      autoCheckoutOnViolation: true,
      geofenceRadiusMeters: 300,
      lowBatteryIntervalMinutes: 10,
      criticalBatterySuspend: false,
    });
    const resolved = await resolvePresenceSettings("inst_alpha");
    expect(resolved.source).toBe("institution");
    expect(resolved.shadowMode).toBe(false);
    expect(resolved.geofenceRadiusMeters).toBe(300);
    expect(resolved.autoCheckoutOnViolation).toBe(true);
  });
});

describe("enforcePresence (fail-closed)", () => {
  beforeEach(() => {
    __setSettingsRow(null);
    __setLocations([]);
    __setThrow(false);
  });

  it("never throws — fails closed to unverified when the DB is unavailable", async () => {
    __setThrow(true);
    const outcome = await enforcePresence({
      claims: { latitude: 12.9716, longitude: 77.5946, accuracy: 10 },
      institutionId: "inst_alpha",
      featureEnabled: true,
    });
    expect(outcome.presenceStatus).toBe("unverified");
    expect(outcome.enforceable).toBe(false);
    expect(outcome.violationsIncrement).toBe(false);
    expect(outcome.error).toBe("db_unavailable");
    expect(outcome.evaluation.unverifiableReasons).toContain("evaluation_error");
  });

  it("produces verified outcome for an inside, plausible reading", async () => {
    __setLocations([location]);
    const outcome = await enforcePresence({
      claims: { latitude: 12.9716, longitude: 77.5947, accuracy: 10 },
      institutionId: "inst_alpha",
      featureEnabled: true,
    });
    expect(outcome.presenceStatus).toBe("verified");
    expect(outcome.settings.source).toBe("defaults");
    expect(outcome.error).toBeUndefined();
  });
});
