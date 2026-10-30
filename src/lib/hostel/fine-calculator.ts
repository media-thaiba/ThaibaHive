import { HostelSettings, FineCalculationResult } from "./types";
import { HostelSettingsMissingError } from "./errors";

/**
 * Calculates late-return fine according to TPSH institutional policy:
 * - If settings are missing: throws HostelSettingsMissingError("Hostel settings not configured for institution")
 * - If late return is within grace period (actual - expected <= grace): 0 fine
 * - If late return exceeds grace period:
 *   - Overdue duration past grace is assessed in 24-hour day units (1440 minutes)
 *   - 'ceil': 1 minute past grace = 1 day, 24h past grace = 1 day, 24h 1m past grace = 2 days
 *   - 'floor': 1 to 1439 mins past grace = 0 days, 1440 mins = 1 day
 *   - Rate is in minor units (paise)
 *   - Total amount is clamped to >= 0
 */
export function calculateLateReturnFine(
  expectedInAt: string,
  actualInAt: string,
  settings: HostelSettings | null | undefined
): FineCalculationResult {
  if (!settings) {
    throw new HostelSettingsMissingError("Hostel settings not configured for institution");
  }

  const expectedMs = new Date(expectedInAt).getTime();
  const actualMs = new Date(actualInAt).getTime();

  if (isNaN(expectedMs) || isNaN(actualMs)) {
    throw new Error("Invalid ISO timestamp provided for fine calculation");
  }

  const diffMs = actualMs - expectedMs;
  if (diffMs <= 0) {
    return {
      daysLate: 0,
      ratePerDayMinor: settings.lateFineRatePerDayMinor,
      totalAmountMinor: 0,
    };
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const graceMinutes = settings.gracePeriodMinutes;

  if (diffMinutes <= graceMinutes) {
    return {
      daysLate: 0,
      ratePerDayMinor: settings.lateFineRatePerDayMinor,
      totalAmountMinor: 0,
    };
  }

  const overduePastGraceMinutes = diffMinutes - graceMinutes;
  const minutesPerDay = 24 * 60; // 1440

  let daysLate = 0;
  if (settings.roundingRule === "ceil") {
    daysLate = Math.ceil(overduePastGraceMinutes / minutesPerDay);
  } else {
    daysLate = Math.floor(overduePastGraceMinutes / minutesPerDay);
  }

  const totalAmountMinor = Math.max(0, daysLate * settings.lateFineRatePerDayMinor);

  return {
    daysLate,
    ratePerDayMinor: settings.lateFineRatePerDayMinor,
    totalAmountMinor,
  };
}
