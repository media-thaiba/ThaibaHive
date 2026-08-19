/**
 * Legacy Token Deprecation Types
 * Sprint-039 / TIF-007 (TD-012)
 */

export type DeprecationMode = "WARN" | "SOFT_ENFORCE" | "STRICT";

export interface DeprecationHeaders {
  Deprecation: string;
  Sunset: string;
  Link: string;
  [key: string]: string;
}

export interface DeprecationProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  sunsetDate: string;
  migrationGuideUrl: string;
}

export interface TokenDeprecationResult {
  isLegacy: boolean;
  isRejected: boolean;
  mode: DeprecationMode;
  headers: Record<string, string>;
  problemDetails?: DeprecationProblemDetails;
}
