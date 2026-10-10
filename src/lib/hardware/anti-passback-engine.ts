export type AntiPassbackMode = "hard" | "soft" | "timed" | "forgiving" | "disabled";

export interface APBLastEvent {
  direction: "in" | "out";
  zoneId?: string | null;
  deviceId: string;
  timestamp: string; // ISO date string
}

export interface APBEvaluationResult {
  allowed: boolean;
  isViolation: boolean;
  violationReason?: string;
  mode: AntiPassbackMode;
}

export class AntiPassbackEngine {
  /**
   * Evaluate anti-passback rule for a badge scan
   * @param currentDirection Current scan direction ('in' | 'out')
   * @param currentDeviceId Device where scan occurred
   * @param currentZoneId Zone where scan occurred
   * @param lastEvent Previous access event record for this badge (if any)
   * @param mode Configured APB mode (default: 'hard')
   * @param options Configurable parameters (cooldownSeconds, jitterWindowSeconds)
   */
  static evaluate(
    currentDirection: "in" | "out",
    currentDeviceId: string,
    currentZoneId?: string | null,
    lastEvent?: APBLastEvent | null,
    mode: AntiPassbackMode = "hard",
    options?: {
      cooldownSeconds?: number; // default 300s (5 min) for timed
      jitterWindowSeconds?: number; // default 5s for forgiving
    }
  ): APBEvaluationResult {
    if (mode === "disabled" || !lastEvent) {
      return { allowed: true, isViolation: false, mode };
    }

    const now = Date.now();
    const lastTime = new Date(lastEvent.timestamp).getTime();
    const elapsedSeconds = Math.max(0, (now - lastTime) / 1000);

    const cooldown = options?.cooldownSeconds ?? 300;
    const jitter = options?.jitterWindowSeconds ?? 5;

    // 1. Forgiving mode: Jitter window check (accidental re-strike / double swipe within 3-5s)
    if (
      (mode === "forgiving" || mode === "hard" || mode === "soft") &&
      elapsedSeconds <= jitter &&
      lastEvent.deviceId === currentDeviceId
    ) {
      // Re-strike forgiveness: allow without logging violation
      return { allowed: true, isViolation: false, mode };
    }

    // 2. Check direction matching
    const isSameDirection = lastEvent.direction === currentDirection;

    if (!isSameDirection) {
      // Normal opposite direction: 'in' followed by 'out', or 'out' followed by 'in'
      return { allowed: true, isViolation: false, mode };
    }

    // Same direction detected ('in' -> 'in' or 'out' -> 'out')
    switch (mode) {
      case "hard":
        return {
          allowed: false,
          isViolation: true,
          violationReason: `Hard anti-passback violation: repeated ${currentDirection} without matching opposite transit`,
          mode,
        };

      case "soft":
        return {
          allowed: true, // Allow transit
          isViolation: true, // But flag security violation alarm
          violationReason: `Soft anti-passback violation: repeated ${currentDirection} logged`,
          mode,
        };

      case "timed":
        if (elapsedSeconds < cooldown) {
          return {
            allowed: false,
            isViolation: true,
            violationReason: `Timed anti-passback violation: ${Math.round(cooldown - elapsedSeconds)}s cooldown remaining before re-${currentDirection}`,
            mode,
          };
        }
        return { allowed: true, isViolation: false, mode };

      case "forgiving":
        return {
          allowed: false,
          isViolation: true,
          violationReason: `Anti-passback violation: repeated ${currentDirection} beyond ${jitter}s jitter window`,
          mode,
        };

      default:
        return { allowed: true, isViolation: false, mode };
    }
  }
}
