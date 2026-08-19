/**
 * Strict Legacy Token Deprecation Engine with RFC 8594 Sunset Headers
 * Sprint-039 / TIF-007 (TD-012)
 */

import { decodeJwt } from "jose";
import { DeprecationMode, TokenDeprecationResult, DeprecationProblemDetails } from "./deprecation-types";

export class LegacyTokenDeprecationEngine {
  private static instance: LegacyTokenDeprecationEngine | null = null;
  private mode: DeprecationMode;
  private sunsetDate: Date;
  private migrationGuideUrl: string;

  constructor(
    mode?: DeprecationMode,
    sunsetDate?: Date,
    migrationGuideUrl: string = "https://thaibahive.edu/docs/dpop-migration"
  ) {
    this.mode =
      mode ||
      (process.env.LEGACY_TOKEN_DEPRECATION_MODE as DeprecationMode) ||
      "WARN";
    this.sunsetDate =
      sunsetDate ||
      (process.env.LEGACY_TOKEN_SUNSET_DATE
        ? new Date(process.env.LEGACY_TOKEN_SUNSET_DATE)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    this.migrationGuideUrl = migrationGuideUrl;
  }

  public static getInstance(): LegacyTokenDeprecationEngine {
    if (!LegacyTokenDeprecationEngine.instance) {
      LegacyTokenDeprecationEngine.instance = new LegacyTokenDeprecationEngine();
    }
    return LegacyTokenDeprecationEngine.instance;
  }

  public getMode(): DeprecationMode {
    return this.mode;
  }

  public setMode(mode: DeprecationMode): void {
    this.mode = mode;
  }

  public getSunsetDate(): Date {
    return this.sunsetDate;
  }

  public setSunsetDate(date: Date): void {
    this.sunsetDate = date;
  }

  /**
   * Detects if a JWT token is a legacy non-DPoP token (lacks cnf.jkt claim).
   */
  public isLegacyToken(token: string): boolean {
    if (!token) return false;
    try {
      const decoded: any = decodeJwt(token);
      return !(decoded && decoded.cnf && decoded.cnf.jkt);
    } catch {
      // Invalid JWT string is handled by auth validator
      return false;
    }
  }

  /**
   * Generates standard RFC 8594 Sunset & Deprecation HTTP headers.
   */
  public getDeprecationHeaders(): Record<string, string> {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    return {
      Deprecation: `@${unixTimestamp}`,
      Sunset: this.sunsetDate.toUTCString(),
      Link: `<${this.migrationGuideUrl}>; rel="sunset"`,
    };
  }

  /**
   * Evaluates a token against the active deprecation policy.
   */
  public evaluate(
    token: string,
    httpMethod: string = "GET"
  ): TokenDeprecationResult {
    const isLegacy = this.isLegacyToken(token);

    if (!isLegacy) {
      return {
        isLegacy: false,
        isRejected: false,
        mode: this.mode,
        headers: {},
      };
    }

    const headers = this.getDeprecationHeaders();
    let isRejected = false;

    if (this.mode === "STRICT") {
      isRejected = true;
    } else if (this.mode === "SOFT_ENFORCE") {
      // Soft enforcement rejects mutation methods, warns on queries
      const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
      isRejected = mutationMethods.includes(httpMethod.toUpperCase());
    } else {
      // WARN mode only attaches headers
      isRejected = false;
    }

    let problemDetails: DeprecationProblemDetails | undefined;
    if (isRejected) {
      problemDetails = {
        type: "https://thaibahive.edu/errors/legacy-token-deprecated",
        title: "Legacy Token Deprecated",
        status: 401,
        detail:
          this.mode === "STRICT"
            ? "Legacy non-DPoP Bearer tokens are deprecated and rejected. Please upgrade to RFC 9449 DPoP cryptographic attestation."
            : "Legacy non-DPoP Bearer tokens are rejected for state mutations under soft deprecation policy. Please upgrade to DPoP.",
        sunsetDate: this.sunsetDate.toISOString(),
        migrationGuideUrl: this.migrationGuideUrl,
      };
    }

    return {
      isLegacy: true,
      isRejected,
      mode: this.mode,
      headers,
      problemDetails,
    };
  }
}
