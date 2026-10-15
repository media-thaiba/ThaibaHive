import { db } from "@/db";
import { presenceVerificationSettings, attendanceLocations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getDistanceMeters } from "@/lib/attendance/geo";
import { parseWifiSsids } from "@/lib/attendance/utils";

/**
 * Server-side presence enforcement core (v3.42.0).
 *
 * The client's `isWithinGeofence`, `distanceFromOffice` and `isMockLocation`
 * claims are NEVER trusted. This engine recomputes them from raw coordinates
 * against the institution's configured attendance locations and applies the
 * tenant's presence-verification settings.
 *
 * Fail-closed policy: if settings/location resolution or evaluation throws,
 * the outcome is `unverified` (presence could not be proven) with hard
 * enforcement disabled — never a silent pass.
 */

export const PRESENCE_DEFAULT_SETTINGS = {
  isEnabled: true,
  shadowMode: true,
  checkIntervalMinutes: 10,
  gracePeriodMinutes: 5,
  autoCheckoutOnViolation: false,
  geofenceRadiusMeters: 150,
  lowBatteryIntervalMinutes: 15,
  criticalBatterySuspend: true,
} as const;

export type PresenceSettingsSource = "institution" | "global" | "defaults";

export interface ResolvedPresenceSettings {
  isEnabled: boolean;
  shadowMode: boolean;
  checkIntervalMinutes: number;
  gracePeriodMinutes: number;
  autoCheckoutOnViolation: boolean;
  geofenceRadiusMeters: number;
  lowBatteryIntervalMinutes: number;
  criticalBatterySuspend: boolean;
  source: PresenceSettingsSource;
}

/** Raw client-submitted presence payload (claims — all untrusted). */
export interface PresenceClaims {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  /** Client claim — ignored by the engine. */
  isWithinGeofence?: boolean;
  /** Client claim — only a positive claim is honored (self-incriminating). */
  isMockLocation?: boolean;
  wifiSsid?: string | null;
  verificationMethod?: string;
  /** Client claim — ignored by the engine. */
  distanceFromOffice?: number | null;
  networkState?: string;
  batteryLevel?: number | null;
}

export interface GeofenceLocationInput {
  id: string;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  wifiSsids: string | null;
}

export interface GeofenceEvaluation {
  /** true = inside, false = outside, null = not determinable from coordinates. */
  withinGeofence: boolean | null;
  /** Nearest location-center distance in meters (null without coordinates). */
  distanceMeters: number | null;
  /** Effective radius applied for the matched location. */
  effectiveRadiusMeters: number | null;
  matchedLocationId: string | null;
  /** WiFi SSID matched a location's configured SSIDs (only fills unknown GPS). */
  wifiMatchedLocationId: string | null;
  geofenceConfigured: boolean;
  mockSuspected: boolean;
  mockReasons: string[];
  /** Reasons coordinates could not yield a verdict (no coords, poor accuracy). */
  unverifiableReasons: string[];
}

export type PresenceStatus = "verified" | "unverified" | "field_work";

export interface EnforcementOutcome {
  presenceStatus: PresenceStatus;
  /** Hard actions (auto-checkout, blocking) allowed: flag && enabled && !shadow. */
  enforceable: boolean;
  /** Whether geofenceViolations counter should increment. */
  violationsIncrement: boolean;
  evaluation: GeofenceEvaluation;
  settings: ResolvedPresenceSettings;
  /** Populated when fail-closed evaluation error occurred. */
  error?: string;
}

/** Resolves effective settings: institution row → global row → defaults. */
export async function resolvePresenceSettings(
  institutionId: string | null | undefined
): Promise<ResolvedPresenceSettings> {
  if (institutionId && institutionId !== "global") {
    const instRow = await db
      .select()
      .from(presenceVerificationSettings)
      .where(eq(presenceVerificationSettings.institutionId, institutionId))
      .limit(1)
      .get();
    if (instRow) {
      return { ...pickSettings(instRow), source: "institution" };
    }
  }

  const globalRow = await db
    .select()
    .from(presenceVerificationSettings)
    .where(isNull(presenceVerificationSettings.institutionId))
    .limit(1)
    .get();
  if (globalRow) {
    return { ...pickSettings(globalRow), source: "global" };
  }

  return { ...PRESENCE_DEFAULT_SETTINGS, source: "defaults" };
}

function pickSettings(row: {
  isEnabled: boolean;
  shadowMode: boolean;
  checkIntervalMinutes: number;
  gracePeriodMinutes: number;
  autoCheckoutOnViolation: boolean;
  geofenceRadiusMeters: number;
  lowBatteryIntervalMinutes: number;
  criticalBatterySuspend: boolean;
}) {
  return {
    isEnabled: row.isEnabled,
    shadowMode: row.shadowMode,
    checkIntervalMinutes: row.checkIntervalMinutes,
    gracePeriodMinutes: row.gracePeriodMinutes,
    autoCheckoutOnViolation: row.autoCheckoutOnViolation,
    geofenceRadiusMeters: row.geofenceRadiusMeters,
    lowBatteryIntervalMinutes: row.lowBatteryIntervalMinutes,
    criticalBatterySuspend: row.criticalBatterySuspend,
  };
}

/** Loads active, non-deleted geofenced locations for an institution. */
export async function loadGeofenceLocations(
  institutionId: string | null | undefined
): Promise<GeofenceLocationInput[]> {
  if (!institutionId || institutionId === "global") return [];
  return db
    .select({
      id: attendanceLocations.id,
      latitude: attendanceLocations.latitude,
      longitude: attendanceLocations.longitude,
      radius: attendanceLocations.radius,
      wifiSsids: attendanceLocations.wifiSsids,
    })
    .from(attendanceLocations)
    .where(
      and(
        eq(attendanceLocations.institutionId, institutionId),
        eq(attendanceLocations.isActive, true),
        isNull(attendanceLocations.deletedAt)
      )
    )
    .all();
}

function hasCoordinates(claims: PresenceClaims): boolean {
  return (
    typeof claims.latitude === "number" &&
    typeof claims.longitude === "number" &&
    Number.isFinite(claims.latitude) &&
    Number.isFinite(claims.longitude)
  );
}

/**
 * Pure server-side recomputation of geofence status and mock suspicion.
 * Client `isWithinGeofence` / `distanceFromOffice` claims are discarded.
 */
export function evaluatePresence(
  claims: PresenceClaims,
  locations: GeofenceLocationInput[],
  settings: ResolvedPresenceSettings
): GeofenceEvaluation {
  const mockReasons: string[] = [];
  const unverifiableReasons: string[] = [];

  // Mock detection — never trust a client `false`; honor only self-incriminating
  // or physically implausible signals.
  if (claims.isMockLocation === true) {
    mockReasons.push("client_declared_mock");
  }
  if (
    typeof claims.latitude === "number" &&
    typeof claims.longitude === "number" &&
    claims.latitude === 0 &&
    claims.longitude === 0
  ) {
    mockReasons.push("null_island_coordinates");
  }
  if (typeof claims.accuracy === "number" && claims.accuracy <= 0) {
    mockReasons.push("non_positive_accuracy");
  }

  const geofenced = locations.filter(
    (l) =>
      typeof l.latitude === "number" && typeof l.longitude === "number"
  );
  const geofenceConfigured = geofenced.length > 0;

  // WiFi fallback: only fills the "no coordinates" gap (GPS wins when present).
  let wifiMatchedLocationId: string | null = null;
  if (!hasCoordinates(claims) && claims.wifiSsid) {
    const ssid = claims.wifiSsid.trim().toLowerCase();
    if (ssid) {
      for (const loc of locations) {
        const allowed = parseWifiSsids(loc.wifiSsids).map((s) =>
          s.trim().toLowerCase()
        );
        if (allowed.includes(ssid)) {
          wifiMatchedLocationId = loc.id;
          break;
        }
      }
    }
  }

  let withinGeofence: boolean | null = null;
  let distanceMeters: number | null = null;
  let effectiveRadiusMeters: number | null = null;
  let matchedLocationId: string | null = null;

  if (hasCoordinates(claims) && geofenceConfigured) {
    let bestInside: {
      id: string;
      distance: number;
      radius: number;
    } | null = null;
    let nearest: { id: string; distance: number; radius: number } | null = null;

    for (const loc of geofenced) {
      const distance = getDistanceMeters(
        claims.latitude as number,
        claims.longitude as number,
        loc.latitude as number,
        loc.longitude as number
      );
      const radius =
        typeof loc.radius === "number" && loc.radius > 0
          ? loc.radius
          : settings.geofenceRadiusMeters;

      if (!nearest || distance < nearest.distance) {
        nearest = { id: loc.id, distance, radius };
      }
      if (distance <= radius) {
        if (!bestInside || distance < bestInside.distance) {
          bestInside = { id: loc.id, distance, radius };
        }
      }
    }

    const reference = bestInside ?? nearest;
    distanceMeters = reference ? Math.round(reference.distance * 10) / 10 : null;
    effectiveRadiusMeters = reference ? reference.radius : null;

    if (bestInside) {
      matchedLocationId = bestInside.id;
      // A reading too imprecise to place inside the radius cannot confirm presence.
      if (
        typeof claims.accuracy === "number" &&
        claims.accuracy > bestInside.radius
      ) {
        withinGeofence = false;
        unverifiableReasons.push("accuracy_exceeds_geofence_radius");
      } else {
        withinGeofence = true;
      }
    } else {
      matchedLocationId = nearest ? nearest.id : null;
      withinGeofence = false;
    }
  } else if (!hasCoordinates(claims)) {
    unverifiableReasons.push("missing_coordinates");
  }

  return {
    withinGeofence,
    distanceMeters,
    effectiveRadiusMeters,
    matchedLocationId,
    wifiMatchedLocationId,
    geofenceConfigured,
    mockSuspected: mockReasons.length > 0,
    mockReasons,
    unverifiableReasons,
  };
}

/**
 * Pure decision function: turns an evaluation + settings into the attendance
 * presence status and enforcement capability for this tick.
 */
export function decidePresence(
  evaluation: GeofenceEvaluation,
  settings: ResolvedPresenceSettings,
  featureEnabled: boolean
): Pick<
  EnforcementOutcome,
  "presenceStatus" | "enforceable" | "violationsIncrement"
> {
  if (!settings.isEnabled) {
    // Institution opted out of verification — never penalize.
    return {
      presenceStatus: "verified",
      enforceable: false,
      violationsIncrement: false,
    };
  }

  if (evaluation.mockSuspected) {
    return {
      presenceStatus: "unverified",
      enforceable: featureEnabled && !settings.shadowMode,
      violationsIncrement: true,
    };
  }

  if (evaluation.withinGeofence === false) {
    return {
      presenceStatus: "field_work",
      enforceable: featureEnabled && !settings.shadowMode,
      violationsIncrement: true,
    };
  }

  if (evaluation.withinGeofence === true) {
    return {
      presenceStatus: "verified",
      enforceable: featureEnabled && !settings.shadowMode,
      violationsIncrement: false,
    };
  }

  // Coordinates undeterminable:
  if (evaluation.wifiMatchedLocationId) {
    return {
      presenceStatus: "verified",
      enforceable: featureEnabled && !settings.shadowMode,
      violationsIncrement: false,
    };
  }
  if (!evaluation.geofenceConfigured) {
    // Nothing configured to enforce against — absence of setup is not a violation.
    return {
      presenceStatus: "verified",
      enforceable: false,
      violationsIncrement: false,
    };
  }
  // Geofence exists but presence could not be proven → fail-closed.
  return {
    presenceStatus: "unverified",
    enforceable: featureEnabled && !settings.shadowMode,
    violationsIncrement: true,
  };
}

/**
 * Full enforcement pass for one presence tick. Recomputes claims server-side
 * and applies tenant settings. Never throws — fails closed to `unverified`.
 *
 * Pass `context` to reuse settings/locations across a batch of ticks
 * (loaded once per request instead of once per log).
 */
export async function enforcePresence(options: {
  claims: PresenceClaims;
  institutionId: string | null | undefined;
  featureEnabled: boolean;
  context?: {
    settings: ResolvedPresenceSettings;
    locations: GeofenceLocationInput[];
  };
}): Promise<EnforcementOutcome> {
  const { claims, institutionId, featureEnabled, context } = options;

  try {
    const [settings, locations] = context
      ? [context.settings, context.locations]
      : await Promise.all([
          resolvePresenceSettings(institutionId),
          loadGeofenceLocations(institutionId),
        ]);

    const evaluation = evaluatePresence(claims, locations, settings);
    const decision = decidePresence(evaluation, settings, featureEnabled);

    return { ...decision, evaluation, settings };
  } catch (err) {
    // Fail-closed: presence could not be verified — never silently pass.
    const message = err instanceof Error ? err.message : "evaluation_failed";
    const settings: ResolvedPresenceSettings = {
      ...PRESENCE_DEFAULT_SETTINGS,
      source: "defaults",
    };
    return {
      presenceStatus: "unverified",
      enforceable: false,
      violationsIncrement: true,
      settings,
      evaluation: {
        withinGeofence: null,
        distanceMeters: null,
        effectiveRadiusMeters: null,
        matchedLocationId: null,
        wifiMatchedLocationId: null,
        geofenceConfigured: false,
        mockSuspected: false,
        mockReasons: [],
        unverifiableReasons: ["evaluation_error"],
      },
      error: message,
    };
  }
}
