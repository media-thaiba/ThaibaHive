/**
 * API Versioning Strategy
 * Supports header-based ('X-API-Version: 1') and query-based ('?v=1') versioning.
 */

export const SUPPORTED_API_VERSIONS = ["1.0", "1.1", "2.0"] as const;
export type ApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];
export const CURRENT_API_VERSION: ApiVersion = "1.0";

export function getRequestedApiVersion(request: Request): {
  version: ApiVersion;
  isSupported: boolean;
  raw: string;
} {
  const url = new URL(request.url);
  const headerVer = request.headers.get("X-API-Version") || request.headers.get("Accept-Version");
  const queryVer = url.searchParams.get("v") || url.searchParams.get("apiVersion");

  const raw = (headerVer || queryVer || CURRENT_API_VERSION).trim();

  // Normalize shorthand numbers "1" -> "1.0", "2" -> "2.0"
  const normalized = raw === "1" ? "1.0" : raw === "2" ? "2.0" : raw;

  const isSupported = (SUPPORTED_API_VERSIONS as readonly string[]).includes(normalized);

  return {
    version: isSupported ? (normalized as ApiVersion) : CURRENT_API_VERSION,
    isSupported,
    raw,
  };
}

export function addApiVersionHeaders(response: Response, version: ApiVersion = CURRENT_API_VERSION): Response {
  response.headers.set("X-API-Version", version);
  return response;
}
